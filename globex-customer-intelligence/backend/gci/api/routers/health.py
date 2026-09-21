from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from gci import __version__
from gci.api.deps import get_db
from gci.api.schemas import DatasetInfo, HealthResponse, ReadinessResponse
from gci.api.services.common import active_runs
from gci.ingest.quality import dataset_info

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> dict:
    return {"status": "ok", "version": __version__}


@router.get("/ready", response_model=ReadinessResponse)
def ready(db: Session = Depends(get_db)) -> dict:
    try:
        has_tx = bool(db.execute(text("SELECT 1 FROM transactions LIMIT 1")).scalar())
        has_customers = bool(db.execute(text("SELECT 1 FROM customers LIMIT 1")).scalar())
        runs = active_runs(db)
    except Exception as exc:  # database unreachable or schema missing
        return {
            "status": "not_ready",
            "database": "unavailable",
            "has_transactions": False,
            "has_customers": False,
            "has_active_models": {},
            "detail": f"{type(exc).__name__}",
        }
    models = {k: v is not None for k, v in runs.items()}
    return {
        "status": "ready" if has_tx and has_customers else "not_ready",
        "database": "ok",
        "has_transactions": has_tx,
        "has_customers": has_customers,
        "has_active_models": models,
        "detail": None
        if has_tx
        else "No data imported yet. Run `gci import-data` and `gci build-analytics`.",
    }


@router.get("/dataset", response_model=DatasetInfo)
def dataset(db: Session = Depends(get_db)) -> dict:
    return dataset_info(db)
