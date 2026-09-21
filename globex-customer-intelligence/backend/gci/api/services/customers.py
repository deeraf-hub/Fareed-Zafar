from __future__ import annotations

import csv
import io
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

from gci.api.errors import ApiError
from gci.api.services.common import active_runs, available, date_bounds, unavailable
from gci.api.sqlfiles import load_sql
from gci.features.snapshots import FEATURE_COLUMNS, FEATURE_LABELS

SORT_COLUMNS = {
    "customer_id": "c.customer_id",
    "last_purchase_at": "c.last_order_at",
    "historical_spend": "c.gross_sales",
    "order_count": "c.order_count",
    "repeat_purchase_probability": "clf.probability",
    "predicted_spend_30d": "reg.predicted_spend",
}
ACTIVITY_OPTIONS = ["active_90", "active_365", "inactive_365"]
EXPORT_MAX_ROWS = 50_000

_BASE_FROM = """
FROM customers c
LEFT JOIN customer_segments seg ON seg.customer_id = c.customer_id AND seg.model_run_id = :seg_run
LEFT JOIN predictions clf ON clf.customer_id = c.customer_id AND clf.model_run_id = :clf_run
LEFT JOIN predictions reg ON reg.customer_id = c.customer_id AND reg.model_run_id = :reg_run
WHERE c.order_count > 0
"""


def _run_ids(session: Session) -> tuple[dict, dict]:
    runs = active_runs(session)
    ids = {
        "seg_run": runs["segmentation"].id if runs["segmentation"] else -1,
        "clf_run": runs["classification"].id if runs["classification"] else -1,
        "reg_run": runs["regression"].id if runs["regression"] else -1,
    }
    return runs, ids


def _filters(
    session: Session,
    search: str | None,
    segment: str | None,
    country: str | None,
    activity: str | None,
) -> tuple[str, dict]:
    clauses, params = [], {}
    if search:
        clauses.append("c.customer_id ILIKE :search")
        params["search"] = f"%{search.strip()}%"
    if segment:
        clauses.append("seg.segment_name = :segment")
        params["segment"] = segment
    if country:
        clauses.append("c.country = :country")
        params["country"] = country
    if activity:
        if activity not in ACTIVITY_OPTIONS:
            raise ApiError(422, "validation_error", f"activity must be one of {ACTIVITY_OPTIONS}")
        bounds = date_bounds(session)
        cutoff = bounds[1] if bounds else date.today()
        if activity == "active_90":
            clauses.append("c.last_order_at >= :act_from")
            params["act_from"] = cutoff - timedelta(days=90)
        elif activity == "active_365":
            clauses.append("c.last_order_at >= :act_from")
            params["act_from"] = cutoff - timedelta(days=365)
        else:
            clauses.append("c.last_order_at < :act_from")
            params["act_from"] = cutoff - timedelta(days=365)
    where = (" AND " + " AND ".join(clauses)) if clauses else ""
    return where, params


def _prediction_values(runs: dict, row: dict) -> tuple[dict, dict]:
    clf, reg = runs["classification"], runs["regression"]
    if clf is None:
        prob = unavailable("No active repeat-purchase model. Run `gci train` and `gci predict`.")
    elif row["probability"] is None:
        prob = unavailable("Not scored: no eligible purchase before the scoring cutoff.")
    else:
        prob = available(row["probability"], row["clf_cutoff"], clf.model_version, row["clf_rank"])
    if reg is None:
        spend = unavailable("No active spending model. Run `gci train` and `gci predict`.")
    elif row["predicted_spend"] is None:
        spend = unavailable("Not scored: no eligible purchase before the scoring cutoff.")
    else:
        spend = available(
            row["predicted_spend"], row["reg_cutoff"], reg.model_version, row["reg_rank"]
        )
    return prob, spend


def _select(where: str, order_sql: str) -> str:
    return f"""
    SELECT c.customer_id, c.country, c.last_order_at, c.gross_sales, c.order_count,
           seg.segment_name,
           clf.probability, clf.rank AS clf_rank, clf.cutoff_date AS clf_cutoff,
           reg.predicted_spend, reg.rank AS reg_rank, reg.cutoff_date AS reg_cutoff
    {_BASE_FROM}{where}
    ORDER BY {order_sql}, c.customer_id
    """


def _order_sql(sort: str, order: str) -> str:
    if sort not in SORT_COLUMNS:
        raise ApiError(422, "validation_error", f"sort must be one of {list(SORT_COLUMNS)}")
    if order not in ("asc", "desc"):
        raise ApiError(422, "validation_error", "order must be 'asc' or 'desc'")
    return f"{SORT_COLUMNS[sort]} {order.upper()} NULLS LAST"


def _to_item(runs: dict, row: dict) -> dict:
    prob, spend = _prediction_values(runs, row)
    return {
        "customer_id": row["customer_id"],
        "segment_name": row["segment_name"],
        "country": row["country"],
        "last_purchase_at": row["last_order_at"],
        "historical_spend": float(row["gross_sales"] or 0),
        "order_count": int(row["order_count"] or 0),
        "repeat_purchase_probability": prob,
        "predicted_spend_30d": spend,
    }


def list_customers(
    session: Session, *, search, segment, country, activity, sort, order, page, page_size
) -> dict:
    runs, ids = _run_ids(session)
    where, params = _filters(session, search, segment, country, activity)
    params |= ids
    total = int(session.execute(text(f"SELECT count(*) {_BASE_FROM}{where}"), params).scalar() or 0)
    sql = _select(where, _order_sql(sort, order)) + " LIMIT :limit OFFSET :offset"
    rows = session.execute(
        text(sql), params | {"limit": page_size, "offset": (page - 1) * page_size}
    ).mappings()
    items = [_to_item(runs, dict(r)) for r in rows]
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": max(1, -(-total // page_size)),
    }


def export_customers(session: Session, *, search, segment, country, activity, sort, order) -> str:
    """Build the CSV for the filtered listing.

    Rows are materialised inside the request (bounded by ``EXPORT_MAX_ROWS``) so the database
    session is released before the response is sent; nothing is held open during streaming.
    """
    runs, ids = _run_ids(session)
    where, params = _filters(session, search, segment, country, activity)
    params |= ids
    sql = _select(where, _order_sql(sort, order)) + f" LIMIT {EXPORT_MAX_ROWS}"
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "customer_id",
            "segment",
            "country",
            "last_purchase",
            "historical_spend_gbp",
            "order_count",
            "repeat_purchase_probability_30d",
            "predicted_spend_30d_gbp",
            "prediction_cutoff",
            "classification_model",
            "regression_model",
        ]
    )
    rows = session.execute(text(sql), params).mappings().all()
    for r in rows:
        item = _to_item(runs, dict(r))
        prob, spend = item["repeat_purchase_probability"], item["predicted_spend_30d"]
        writer.writerow(
            [
                item["customer_id"],
                item["segment_name"] or "",
                item["country"] or "",
                item["last_purchase_at"].date().isoformat() if item["last_purchase_at"] else "",
                f"{item['historical_spend']:.2f}",
                item["order_count"],
                f"{prob['value']:.4f}" if prob["status"] == "available" else "unavailable",
                f"{spend['value']:.2f}" if spend["status"] == "available" else "unavailable",
                prob["cutoff_date"] or spend["cutoff_date"] or "",
                prob["model_version"] or "",
                spend["model_version"] or "",
            ]
        )
    return buffer.getvalue()


def filter_options(session: Session) -> dict:
    runs, ids = _run_ids(session)
    segments = [
        r[0]
        for r in session.execute(
            text(
                "SELECT segment_name FROM customer_segments WHERE model_run_id = :seg_run "
                "GROUP BY segment_name ORDER BY count(*) DESC"
            ),
            ids,
        )
    ]
    countries = [
        {"country": r[0], "customers": int(r[1])}
        for r in session.execute(
            text(
                "SELECT country, count(*) FROM customers WHERE order_count > 0 AND country IS NOT "
                "NULL GROUP BY country ORDER BY count(*) DESC"
            )
        )
    ]
    return {"segments": segments, "countries": countries, "activity": ACTIVITY_OPTIONS}


def customer_detail(session: Session, customer_id: str) -> dict:
    runs, ids = _run_ids(session)
    row = (
        session.execute(
            text(
                f"""
            SELECT c.customer_id, c.country, c.first_order_at, c.last_order_at, c.order_count,
                   c.return_order_count, c.gross_sales, c.return_amount, c.net_revenue,
                   c.distinct_products, c.last_order_at, seg.segment_name, seg.cluster_id,
                   seg.recency_days AS seg_recency, seg.frequency AS seg_frequency,
                   seg.monetary AS seg_monetary, seg.cutoff_date AS seg_cutoff,
                   clf.probability, clf.rank AS clf_rank, clf.cutoff_date AS clf_cutoff,
                   reg.predicted_spend, reg.rank AS reg_rank, reg.cutoff_date AS reg_cutoff
            {_BASE_FROM} AND c.customer_id = :customer_id
            """
            ),
            ids | {"customer_id": customer_id},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise ApiError(404, "not_found", f"Customer '{customer_id}' not found")
    row = dict(row)
    prob, spend = _prediction_values(runs, row)

    orders = [
        {
            "invoice": r["invoice"],
            "order_at": r["order_at"],
            "is_cancellation": bool(r["is_cancellation"]),
            "line_count": int(r["line_count"]),
            "units": int(r["units"]),
            "gross_amount": float(r["gross_amount"]),
            "return_amount": float(r["return_amount"]),
            "net_amount": float(r["net_amount"]),
        }
        for r in session.execute(
            text(
                "SELECT invoice, order_at, is_cancellation, line_count, units, gross_amount, "
                "return_amount, net_amount FROM orders WHERE customer_id = :customer_id "
                "ORDER BY order_at DESC, invoice DESC"
            ),
            {"customer_id": customer_id},
        ).mappings()
    ]
    spend_trend = [
        {
            "month": r["month"],
            "gross_sales": float(r["gross_sales"]),
            "net_revenue": float(r["net_revenue"]),
            "orders": int(r["orders"]),
        }
        for r in session.execute(
            load_sql("customer_monthly_spend"), {"customer_id": customer_id}
        ).mappings()
    ]
    snapshot = (
        session.execute(
            text(
                "SELECT * FROM customer_snapshots WHERE customer_id = :customer_id "
                "AND dataset_split = 'scoring' LIMIT 1"
            ),
            {"customer_id": customer_id},
        )
        .mappings()
        .first()
    )
    indicators = []
    if snapshot is not None:
        for name in FEATURE_COLUMNS:
            label, unit = FEATURE_LABELS[name]
            value = snapshot[name]
            indicators.append(
                {
                    "name": name,
                    "label": label,
                    "value": (float(value) if value is not None else None),
                    "unit": unit,
                }
            )
    seg_run = runs["segmentation"]
    rfm = None
    if seg_run is not None and row["seg_cutoff"] is not None:
        rfm = {
            "cutoff_date": row["seg_cutoff"],
            "lookback_days": int(seg_run.params.get("lookback_days", 365))
            if seg_run.params
            else 365,
            "recency_days": int(row["seg_recency"]),
            "frequency": int(row["seg_frequency"]),
            "monetary": float(row["seg_monetary"]),
            "segment_name": row["segment_name"],
            "cluster_id": int(row["cluster_id"]),
            "model_version": seg_run.model_version,
        }
    return {
        "customer_id": row["customer_id"],
        "country": row["country"],
        "first_purchase_at": row["first_order_at"],
        "last_purchase_at": row["last_order_at"],
        "order_count": int(row["order_count"]),
        "return_order_count": int(row["return_order_count"]),
        "gross_sales": float(row["gross_sales"]),
        "return_amount": float(row["return_amount"]),
        "net_revenue": float(row["net_revenue"]),
        "distinct_products": int(row["distinct_products"]),
        "segment_name": row["segment_name"],
        "rfm": rfm,
        "repeat_purchase_probability": prob,
        "predicted_spend_30d": spend,
        "behavioural_indicators": indicators,
        "spend_trend": spend_trend,
        "purchase_history": orders,
    }
