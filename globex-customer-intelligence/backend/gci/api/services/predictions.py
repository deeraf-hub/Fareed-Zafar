from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from gci.api.errors import ApiError
from gci.api.services.common import active_runs
from gci.ml.scoring import PREDICTION_TYPES

TYPE_TO_MODEL = {v: k for k, v in PREDICTION_TYPES.items()}


def list_predictions(session: Session, prediction_type: str, page: int, page_size: int) -> dict:
    if prediction_type not in TYPE_TO_MODEL:
        raise ApiError(422, "validation_error", f"type must be one of {list(TYPE_TO_MODEL)}")
    runs = active_runs(session)
    run = runs[TYPE_TO_MODEL[prediction_type]]
    seg_run = runs["segmentation"]
    empty = {"items": [], "page": page, "page_size": page_size, "total": 0, "total_pages": 1}
    if run is None:
        return {
            "meta": {
                "status": "unavailable",
                "prediction_type": prediction_type,
                "model_version": None,
                "cutoff_date": None,
                "scored_customers": 0,
                "reason": "No active model for this prediction type. "
                "Run `gci train` then `gci predict`.",
            },
            "results": empty,
        }
    params = {"run": run.id, "seg_run": seg_run.id if seg_run else -1}
    total = int(
        session.execute(
            text("SELECT count(*) FROM predictions WHERE model_run_id = :run"), params
        ).scalar()
        or 0
    )
    if total == 0:
        return {
            "meta": {
                "status": "unavailable",
                "prediction_type": prediction_type,
                "model_version": run.model_version,
                "cutoff_date": run.scoring_cutoff,
                "scored_customers": 0,
                "reason": "Model trained but no stored predictions. Run `gci predict`.",
            },
            "results": empty,
        }
    rows = session.execute(
        text(
            """
            SELECT p.customer_id, p.prediction_type, p.cutoff_date, p.probability,
                   p.predicted_spend,
                   p.rank, seg.segment_name
            FROM predictions p
            LEFT JOIN customer_segments seg
                   ON seg.customer_id = p.customer_id AND seg.model_run_id = :seg_run
            WHERE p.model_run_id = :run
            ORDER BY p.rank ASC
            LIMIT :limit OFFSET :offset
            """
        ),
        params | {"limit": page_size, "offset": (page - 1) * page_size},
    ).mappings()
    items = [
        {
            "customer_id": r["customer_id"],
            "prediction_type": r["prediction_type"],
            "cutoff_date": r["cutoff_date"],
            "model_version": run.model_version,
            "probability": float(r["probability"]) if r["probability"] is not None else None,
            "predicted_spend": float(r["predicted_spend"])
            if r["predicted_spend"] is not None
            else None,
            "rank": int(r["rank"]) if r["rank"] is not None else None,
            "segment_name": r["segment_name"],
        }
        for r in rows
    ]
    return {
        "meta": {
            "status": "available",
            "prediction_type": prediction_type,
            "model_version": run.model_version,
            "cutoff_date": run.scoring_cutoff,
            "scored_customers": total,
            "reason": None,
        },
        "results": {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": max(1, -(-total // page_size)),
        },
    }
