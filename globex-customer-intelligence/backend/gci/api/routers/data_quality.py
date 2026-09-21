from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from gci.api.deps import get_db
from gci.api.schemas import DataQualityResponse
from gci.ingest.quality import quality_report

router = APIRouter(tags=["data-quality"])


@router.get("/data-quality", response_model=DataQualityResponse)
def data_quality(db: Session = Depends(get_db)) -> dict:
    return quality_report(db)
