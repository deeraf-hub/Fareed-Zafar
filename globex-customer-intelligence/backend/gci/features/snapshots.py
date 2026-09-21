"""Point-in-time customer snapshots (features) with forward-looking labels.

Leakage rules implemented here
------------------------------
* Features for cutoff ``c`` use only orders with ``order_at < c``.
* Labels use orders with ``c <= order_at < c + horizon``.
* A snapshot is labelled only when its full outcome window lies inside the data
  (``outcome_window_complete``); the last, incomplete cutoff is kept as the *scoring* snapshot.
* Splits are chronological by cutoff: the last ``n_test`` labelled cutoffs are the final test
  period, the ``n_validation`` before them are validation, everything earlier is training.
  Snapshots whose outcome window crosses into the next period are marked ``purged`` and never
  used for fitting or evaluation.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from gci.config import get_settings
from gci.db.session import session_scope
from gci.ingest.importer import copy_frame

log = logging.getLogger(__name__)

FEATURE_COLUMNS: list[str] = [
    "tenure_days",
    "recency_days",
    "orders_lifetime",
    "spend_lifetime",
    "avg_order_value",
    "orders_lookback",
    "spend_lookback",
    "orders_90",
    "spend_90",
    "orders_60",
    "spend_60",
    "orders_30",
    "spend_30",
    "spend_prior_90",
    "spend_trend",
    "mean_interpurchase_days",
    "last_interpurchase_days",
    "distinct_products",
    "return_orders_lifetime",
    "return_amount_lifetime",
    "is_uk",
]

FEATURE_LABELS: dict[str, tuple[str, str]] = {
    "tenure_days": ("Days since first purchase", "days"),
    "recency_days": ("Days since last purchase", "days"),
    "orders_lifetime": ("Orders to date", "count"),
    "spend_lifetime": ("Spending to date", "gbp"),
    "avg_order_value": ("Average basket value", "gbp"),
    "orders_lookback": ("Orders in last 365 days", "count"),
    "spend_lookback": ("Spending in last 365 days", "gbp"),
    "orders_90": ("Orders in last 90 days", "count"),
    "spend_90": ("Spending in last 90 days", "gbp"),
    "orders_60": ("Orders in last 60 days", "count"),
    "spend_60": ("Spending in last 60 days", "gbp"),
    "orders_30": ("Orders in last 30 days", "count"),
    "spend_30": ("Spending in last 30 days", "gbp"),
    "spend_prior_90": ("Spending in days 91-180 before cutoff", "gbp"),
    "spend_trend": ("Recent vs earlier spending (-1 to 1)", "ratio"),
    "mean_interpurchase_days": ("Average days between purchases", "days"),
    "last_interpurchase_days": ("Days between the last two purchases", "days"),
    "distinct_products": ("Distinct products bought", "count"),
    "return_orders_lifetime": ("Cancellation invoices to date", "count"),
    "return_amount_lifetime": ("Returned value to date", "gbp"),
    "is_uk": ("Customer in the United Kingdom", "ratio"),
}


@dataclass
class SplitPlan:
    labelled_cutoffs: list[date]
    scoring_cutoff: date
    train: list[date]
    validation: list[date]
    test: list[date]
    purged: list[date]


def generate_cutoffs(
    first_order: date, last_order: date, *, frequency: str, horizon_days: int, min_history_days: int
) -> tuple[list[date], date]:
    """Return labelled cutoffs (complete outcome window) and the scoring cutoff."""
    start = first_order + timedelta(days=min_history_days)
    if frequency == "monthly":
        cursor = date(start.year, start.month, 1)
        if cursor < start:
            cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
        step = None
    elif frequency == "weekly":
        cursor = start + timedelta(days=(7 - start.weekday()) % 7)  # next Monday
        step = timedelta(days=7)
    else:
        raise ValueError("frequency must be 'monthly' or 'weekly'")

    cutoffs: list[date] = []
    while cursor + timedelta(days=horizon_days - 1) <= last_order:
        cutoffs.append(cursor)
        if step is None:
            cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
        else:
            cursor += step
    scoring_cutoff = last_order + timedelta(days=1)
    return cutoffs, scoring_cutoff


def plan_splits(
    labelled_cutoffs: list[date],
    scoring_cutoff: date,
    *,
    horizon_days: int,
    n_validation: int = 3,
    n_test: int = 3,
) -> SplitPlan:
    cutoffs = sorted(labelled_cutoffs)
    if len(cutoffs) < n_validation + n_test + 1:
        raise ValueError("Not enough labelled cutoffs for train/validation/test splits")
    test = cutoffs[-n_test:]
    validation = cutoffs[-(n_test + n_validation) : -n_test]
    train = cutoffs[: -(n_test + n_validation)]
    purged: list[date] = []

    def purge(period: list[date], next_start: date) -> list[date]:
        kept = []
        for c in period:
            if c + timedelta(days=horizon_days) > next_start:
                purged.append(c)
            else:
                kept.append(c)
        return kept

    train = purge(train, validation[0])
    validation = purge(validation, test[0])
    return SplitPlan(cutoffs, scoring_cutoff, train, validation, test, purged)


def _load_orders(session: Session) -> pd.DataFrame:
    sql = """
    SELECT o.invoice, o.customer_id, o.order_at, o.gross_amount::float AS gross_amount,
           o.return_amount::float AS return_amount, o.is_eligible_positive, o.is_cancellation,
           c.country
    FROM orders o JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.customer_id IS NOT NULL
    """
    frame = pd.read_sql(text(sql), session.connection())
    frame["order_at"] = pd.to_datetime(frame["order_at"])
    return frame


def _load_items(session: Session) -> pd.DataFrame:
    sql = """
    SELECT o.customer_id, o.order_at, oi.stock_code
    FROM order_items oi JOIN orders o ON o.invoice = oi.invoice
    WHERE oi.is_eligible_sale AND o.customer_id IS NOT NULL
    """
    frame = pd.read_sql(text(sql), session.connection())
    frame["order_at"] = pd.to_datetime(frame["order_at"])
    return frame


def compute_snapshot(
    orders: pd.DataFrame,
    items: pd.DataFrame,
    cutoff: date,
    *,
    horizon_days: int,
    lookback_days: int,
    last_data_date: date,
) -> pd.DataFrame:
    """Features strictly before ``cutoff`` and labels from the following window."""
    c = pd.Timestamp(cutoff)
    hist = orders[orders["order_at"] < c]
    pos = hist[hist["is_eligible_positive"]]
    if pos.empty:
        return pd.DataFrame()

    def window(days: int, offset: int = 0) -> pd.DataFrame:
        lo = c - pd.Timedelta(days=days + offset)
        hi = c - pd.Timedelta(days=offset)
        return pos[(pos["order_at"] >= lo) & (pos["order_at"] < hi)]

    g = pos.groupby("customer_id")
    feats = pd.DataFrame(
        {
            "first_order_at": g["order_at"].min(),
            "last_order_at": g["order_at"].max(),
            "orders_lifetime": g.size(),
            "spend_lifetime": g["gross_amount"].sum(),
        }
    )
    feats["avg_order_value"] = feats["spend_lifetime"] / feats["orders_lifetime"]
    feats["tenure_days"] = (c - feats["first_order_at"]).dt.days
    feats["recency_days"] = (c - feats["last_order_at"]).dt.days

    for name, days, offset in (
        ("lookback", lookback_days, 0),
        ("90", 90, 0),
        ("60", 60, 0),
        ("30", 30, 0),
    ):
        w = window(days, offset).groupby("customer_id")
        feats[f"orders_{name}"] = w.size().reindex(feats.index).fillna(0).astype(int)
        feats[f"spend_{name}"] = w["gross_amount"].sum().reindex(feats.index).fillna(0.0)
    prior = window(90, 90).groupby("customer_id")["gross_amount"].sum()
    feats["spend_prior_90"] = prior.reindex(feats.index).fillna(0.0)
    denom = feats["spend_90"] + feats["spend_prior_90"]
    feats["spend_trend"] = np.where(
        denom > 0, (feats["spend_90"] - feats["spend_prior_90"]) / denom.replace(0, np.nan), 0.0
    )

    days = pos.assign(day=pos["order_at"].dt.normalize())[["customer_id", "day"]].drop_duplicates()
    days = days.sort_values(["customer_id", "day"])
    days["gap"] = days.groupby("customer_id")["day"].diff().dt.days
    gaps = days.dropna(subset=["gap"]).groupby("customer_id")["gap"]
    feats["mean_interpurchase_days"] = gaps.mean().reindex(feats.index)
    feats["last_interpurchase_days"] = gaps.last().reindex(feats.index)

    ret = hist[hist["is_cancellation"] & (hist["return_amount"] < 0)].groupby("customer_id")
    feats["return_orders_lifetime"] = ret.size().reindex(feats.index).fillna(0).astype(int)
    feats["return_amount_lifetime"] = ret["return_amount"].sum().reindex(feats.index).fillna(0.0)

    variety = items[items["order_at"] < c].groupby("customer_id")["stock_code"].nunique()
    feats["distinct_products"] = variety.reindex(feats.index).fillna(0).astype(int)
    country = orders.groupby("customer_id")["country"].first()
    feats["is_uk"] = country.reindex(feats.index).eq("United Kingdom")

    # labels
    window_end = c + pd.Timedelta(days=horizon_days)
    complete = (cutoff + timedelta(days=horizon_days - 1)) <= last_data_date
    fut = orders[
        orders["is_eligible_positive"]
        & (orders["order_at"] >= c)
        & (orders["order_at"] < window_end)
    ]
    fut_spend = fut.groupby("customer_id")["gross_amount"].sum().reindex(feats.index).fillna(0.0)
    feats["outcome_window_complete"] = complete
    feats["label_purchased"] = (fut_spend > 0) if complete else None
    feats["label_spend"] = fut_spend if complete else None
    feats["cutoff_date"] = cutoff
    feats["horizon_days"] = horizon_days
    feats["lookback_days"] = lookback_days
    feats = feats.drop(columns=["first_order_at", "last_order_at"]).reset_index()
    return feats


def build_snapshots(
    frequency: str = "monthly",
    *,
    min_history_days: int = 90,
    n_validation: int = 3,
    n_test: int = 3,
) -> dict:
    settings = get_settings()
    horizon, lookback = settings.horizon_days, settings.lookback_days
    with session_scope() as session:
        orders = _load_orders(session)
        items = _load_items(session)
        if orders.empty:
            raise RuntimeError("No orders found. Run `gci import-data` and `gci build-analytics`.")
        pos = orders[orders["is_eligible_positive"]]
        first_order = pos["order_at"].min().date()
        last_order = pos["order_at"].max().date()
        labelled, scoring = generate_cutoffs(
            first_order,
            last_order,
            frequency=frequency,
            horizon_days=horizon,
            min_history_days=min_history_days,
        )
        plan = plan_splits(
            labelled, scoring, horizon_days=horizon, n_validation=n_validation, n_test=n_test
        )
        split_of: dict[date, str] = {}
        for name, cutoffs in (
            ("train", plan.train),
            ("validation", plan.validation),
            ("test", plan.test),
            ("purged", plan.purged),
        ):
            for c in cutoffs:
                split_of[c] = name
        split_of[scoring] = "scoring"

        frames = []
        for cutoff in [*labelled, scoring]:
            snap = compute_snapshot(
                orders,
                items,
                cutoff,
                horizon_days=horizon,
                lookback_days=lookback,
                last_data_date=last_order,
            )
            if snap.empty:
                continue
            snap["dataset_split"] = split_of[cutoff]
            frames.append(snap)
            log.info("snapshot built", extra={"cutoff": str(cutoff), "rows": len(snap)})
        snapshots = pd.concat(frames, ignore_index=True)
        snapshots["created_at"] = datetime.now(UTC)

        session.execute(text("TRUNCATE customer_snapshots RESTART IDENTITY CASCADE"))
        columns = [
            "customer_id",
            "cutoff_date",
            "horizon_days",
            "lookback_days",
            *FEATURE_COLUMNS,
            "outcome_window_complete",
            "label_purchased",
            "label_spend",
            "dataset_split",
            "created_at",
        ]
        copy_frame(session, "customer_snapshots", snapshots[columns])
        summary = {
            "snapshots": int(len(snapshots)),
            "customers": int(snapshots["customer_id"].nunique()),
            "frequency": frequency,
            "labelled_cutoffs": [str(c) for c in labelled],
            "scoring_cutoff": str(scoring),
            "splits": snapshots["dataset_split"].value_counts().to_dict(),
            "train_period": [str(plan.train[0]), str(plan.train[-1])] if plan.train else None,
            "validation_period": [str(plan.validation[0]), str(plan.validation[-1])],
            "test_period": [str(plan.test[0]), str(plan.test[-1])],
            "purged_cutoffs": [str(c) for c in plan.purged],
        }
    log.info("snapshots stored", extra=summary)
    return summary


def load_snapshots(session: Session, splits: list[str] | None = None) -> pd.DataFrame:
    sql = "SELECT * FROM customer_snapshots"
    params: dict = {}
    if splits:
        sql += " WHERE dataset_split = ANY(:splits)"
        params["splits"] = splits
    frame = pd.read_sql(text(sql), session.connection(), params=params)
    frame["cutoff_date"] = pd.to_datetime(frame["cutoff_date"]).dt.date
    return frame
