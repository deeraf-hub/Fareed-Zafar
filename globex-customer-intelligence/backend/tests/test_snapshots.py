from __future__ import annotations

from datetime import date, datetime

import pandas as pd
import pytest

from gci.features.snapshots import (
    FEATURE_COLUMNS,
    compute_snapshot,
    generate_cutoffs,
    plan_splits,
)


def _orders(rows):
    frame = pd.DataFrame(
        rows,
        columns=[
            "invoice",
            "customer_id",
            "order_at",
            "gross_amount",
            "return_amount",
            "is_eligible_positive",
            "is_cancellation",
            "country",
        ],
    )
    frame["order_at"] = pd.to_datetime(frame["order_at"])
    return frame


EMPTY_ITEMS = pd.DataFrame(
    {
        "customer_id": pd.Series(dtype=str),
        "order_at": pd.Series(dtype="datetime64[ns]"),
        "stock_code": pd.Series(dtype=str),
    }
)


def test_label_window_is_half_open_and_features_exclude_cutoff():
    cutoff = date(2020, 6, 1)
    orders = _orders(
        [
            ["1", "A", datetime(2020, 5, 30, 12), 100.0, 0.0, True, False, "United Kingdom"],
            [
                "2",
                "A",
                datetime(2020, 6, 1, 0, 0),
                50.0,
                0.0,
                True,
                False,
                "United Kingdom",
            ],  # at cutoff -> label
            [
                "3",
                "A",
                datetime(2020, 6, 30, 23, 59),
                25.0,
                0.0,
                True,
                False,
                "United Kingdom",
            ],  # day 30 -> label
            [
                "4",
                "A",
                datetime(2020, 7, 1, 0, 0),
                999.0,
                0.0,
                True,
                False,
                "United Kingdom",
            ],  # outside window
            ["5", "B", datetime(2020, 5, 1, 12), 10.0, 0.0, True, False, "France"],
        ]
    )
    snap = compute_snapshot(
        orders,
        EMPTY_ITEMS,
        cutoff,
        horizon_days=30,
        lookback_days=365,
        last_data_date=date(2020, 12, 31),
    ).set_index("customer_id")
    assert snap.loc["A", "orders_lifetime"] == 1 and snap.loc["A", "spend_lifetime"] == 100.0
    assert snap.loc["A", "recency_days"] == 1  # whole days from 30 May 12:00 to 1 June 00:00
    assert snap.loc["A", "label_purchased"] is True or snap.loc["A", "label_purchased"] == True  # noqa: E712
    assert snap.loc["A", "label_spend"] == 75.0
    assert snap.loc["B", "label_purchased"] == False and snap.loc["B", "label_spend"] == 0.0  # noqa: E712
    assert bool(snap["outcome_window_complete"].all())


def test_incomplete_outcome_window_has_no_label():
    orders = _orders([["1", "A", datetime(2020, 5, 1), 10.0, 0.0, True, False, "United Kingdom"]])
    snap = compute_snapshot(
        orders,
        EMPTY_ITEMS,
        date(2020, 6, 1),
        horizon_days=30,
        lookback_days=365,
        last_data_date=date(2020, 6, 15),
    )
    assert not snap["outcome_window_complete"].iloc[0]
    assert snap["label_purchased"].iloc[0] is None and snap["label_spend"].iloc[0] is None


def test_features_do_not_change_when_future_data_is_added():
    cutoff = date(2020, 6, 1)
    history = [
        ["1", "A", datetime(2020, 1, 10), 100.0, 0.0, True, False, "United Kingdom"],
        ["2", "A", datetime(2020, 4, 2), 40.0, 0.0, True, False, "United Kingdom"],
        ["C3", "A", datetime(2020, 4, 5), 0.0, -10.0, False, True, "United Kingdom"],
    ]
    future = [
        ["4", "A", datetime(2020, 6, 3), 500.0, 0.0, True, False, "United Kingdom"],
        ["5", "A", datetime(2020, 9, 3), 700.0, 0.0, True, False, "United Kingdom"],
    ]
    base = compute_snapshot(
        _orders(history),
        EMPTY_ITEMS,
        cutoff,
        horizon_days=30,
        lookback_days=365,
        last_data_date=date(2020, 12, 31),
    )
    extended = compute_snapshot(
        _orders(history + future),
        EMPTY_ITEMS,
        cutoff,
        horizon_days=30,
        lookback_days=365,
        last_data_date=date(2020, 12, 31),
    )
    pd.testing.assert_frame_equal(base[FEATURE_COLUMNS], extended[FEATURE_COLUMNS])
    assert base["label_spend"].iloc[0] == 0.0 and extended["label_spend"].iloc[0] == 500.0


def test_monthly_cutoffs_require_complete_windows():
    labelled, scoring = generate_cutoffs(
        date(2019, 1, 15),
        date(2020, 12, 20),
        frequency="monthly",
        horizon_days=30,
        min_history_days=90,
    )
    assert labelled[0] == date(2019, 5, 1)
    assert labelled[-1] == date(2020, 11, 1)  # Dec 1 + 29 days > Dec 20
    assert scoring == date(2020, 12, 21)


def test_split_plan_is_chronological_and_purges_boundaries():
    weekly, scoring = generate_cutoffs(
        date(2019, 1, 7), date(2020, 6, 30), frequency="weekly", horizon_days=30, min_history_days=0
    )
    plan = plan_splits(weekly, scoring, horizon_days=30, n_validation=8, n_test=8)
    assert max(plan.train) < min(plan.validation) < min(plan.test)
    # Weekly cutoffs with a 30-day horizon: the last four training weeks and the last four
    # validation weeks have outcome windows that cross into the next period, so they are purged.
    assert len(plan.purged) == 8
    assert len(plan.validation) == 4
    for c in plan.train:
        assert c + pd.Timedelta(days=30).to_pytimedelta() <= plan.validation[0]
    for c in plan.validation:
        assert c + pd.Timedelta(days=30).to_pytimedelta() <= plan.test[0]
    assert set(plan.purged).isdisjoint(plan.train + plan.validation + plan.test)


def test_split_plan_rejects_too_few_cutoffs():
    with pytest.raises(ValueError):
        plan_splits([date(2020, 1, 1), date(2020, 2, 1)], date(2020, 3, 1), horizon_days=30)
