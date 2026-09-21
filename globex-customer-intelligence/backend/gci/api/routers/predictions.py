from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from gci.api.deps import get_db
from gci.api.schemas import PredictionsResponse
from gci.api.services.predictions import list_predictions

router = APIRouter(tags=["predictions"])


@router.get("/predictions", response_model=PredictionsResponse)
def predictions(
    type: str = Query(
        "repeat_purchase_probability",
        description="repeat_purchase_probability | predicted_spend_30d",
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    return list_predictions(db, type, page, page_size)
