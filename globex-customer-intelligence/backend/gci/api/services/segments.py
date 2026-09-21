from __future__ import annotations

from sqlalchemy.orm import Session

from gci.config import get_settings
from gci.ml.tracking import active_run


def segment_profiles(run) -> list[dict]:
    if run is None or not run.metrics:
        return []
    keys = (
        "cluster_id",
        "segment_name",
        "customers",
        "share",
        "avg_recency_days",
        "median_recency_days",
        "avg_frequency",
        "median_frequency",
        "avg_monetary",
        "median_monetary",
        "total_monetary",
        "revenue_share",
        "description",
    )
    return [{k: p[k] for k in keys} for p in run.metrics.get("profiles", [])]


def segments(session: Session) -> dict:
    run = active_run(session, "segmentation")
    lookback = get_settings().lookback_days
    if run is None:
        return {
            "model_version": None,
            "cutoff_date": None,
            "lookback_days": lookback,
            "segments": [],
            "status": "unavailable",
            "reason": "No active segmentation model. Run `gci train-segmentation`.",
        }
    return {
        "model_version": run.model_version,
        "cutoff_date": run.scoring_cutoff,
        "lookback_days": int(run.params.get("lookback_days", lookback)) if run.params else lookback,
        "segments": segment_profiles(run),
        "status": "available",
        "reason": None,
    }
