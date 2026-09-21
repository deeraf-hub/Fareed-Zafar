from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from gci.api.deps import get_db
from gci.api.errors import ApiError
from gci.api.schemas import OverviewResponse
from gci.api.services.overview import overview as overview_service

router = APIRouter(tags=["overview"])


@router.get("/overview", response_model=OverviewResponse)
def overview(
    start: date | None = Query(None, description="Period start (inclusive), YYYY-MM-DD"),
    end: date | None = Query(None, description="Period end (inclusive), YYYY-MM-DD"),
    db: Session = Depends(get_db),
) -> dict:
    if start and end and start > end:
        raise ApiError(422, "validation_error", "start must not be after end")
    return overview_service(db, start, end)
