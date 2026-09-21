"""Shared feature preparation for the supervised models."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from gci.features.snapshots import FEATURE_COLUMNS

NUMERIC_FEATURES = [c for c in FEATURE_COLUMNS if c != "is_uk"]
BOOLEAN_FEATURES = ["is_uk"]
RANDOM_STATE = 42


def prepare_X(frame: pd.DataFrame) -> pd.DataFrame:
    X = frame[FEATURE_COLUMNS].copy()
    X["is_uk"] = X["is_uk"].astype(float)
    for col in NUMERIC_FEATURES:
        X[col] = pd.to_numeric(X[col], errors="coerce").astype(float)
    return X


def make_preprocessor(scale: bool) -> ColumnTransformer:
    """Imputers and scalers are fitted inside the pipeline, i.e. on training data only."""
    steps = [("impute", SimpleImputer(strategy="median", add_indicator=True))]
    if scale:
        steps.append(("scale", StandardScaler()))
    return ColumnTransformer(
        [("num", Pipeline(steps), NUMERIC_FEATURES), ("bool", "passthrough", BOOLEAN_FEATURES)]
    )


def split_frames(snapshots: pd.DataFrame) -> dict[str, pd.DataFrame]:
    labelled = snapshots[snapshots["outcome_window_complete"]].copy()
    labelled["label_purchased"] = labelled["label_purchased"].astype(bool).astype(int)
    labelled["label_spend"] = labelled["label_spend"].astype(float)
    return {
        name: labelled[labelled["dataset_split"] == name].reset_index(drop=True)
        for name in ("train", "validation", "test")
    }


def period(frame: pd.DataFrame) -> tuple | None:
    if frame.empty:
        return None
    return (min(frame["cutoff_date"]), max(frame["cutoff_date"]))


def safe_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return None if np.isnan(f) else f


COMMON_LIMITATIONS = [
    "Snapshots are taken monthly, so most customers appear several times in the training data; "
    "observations are not independent. Confidence intervals resample whole customers to reflect "
    "this, but they remain approximate.",
    "The data ends on 9 December 2011. Scores are computed at the latest usable historical cutoff "
    "(10 December 2011) and describe that point in time, not current activity.",
    "Only identified customers (with a customer ID) are modelled; anonymous transactions are "
    "reported in aggregates but never scored.",
    "Feature importance or model coefficients describe associations in historical data, not "
    "causes. Whether prioritising outreach changes purchasing has not been tested.",
]
