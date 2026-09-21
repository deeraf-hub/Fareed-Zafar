from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from gci.api.deps import get_db
from gci.api.schemas import SegmentsResponse
from gci.api.services.segments import segments as svc

router = APIRouter(tags=["segments"])


@router.get("/segments", response_model=SegmentsResponse)
def segments(db: Session = Depends(get_db)) -> dict:
    return svc(db)
