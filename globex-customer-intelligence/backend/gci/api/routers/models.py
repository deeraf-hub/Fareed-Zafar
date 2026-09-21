from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from gci.api.deps import get_db
from gci.api.schemas import ModelsResponse
from gci.api.services.models import models_overview

router = APIRouter(tags=["models"])


@router.get("/models", response_model=ModelsResponse)
def models(db: Session = Depends(get_db)) -> dict:
    return models_overview(db)
