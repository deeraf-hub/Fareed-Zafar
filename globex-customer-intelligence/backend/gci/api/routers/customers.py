from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from gci.api.deps import get_db
from gci.api.schemas import CustomerDetail, CustomerFilterOptions, CustomerListItem, Paginated
from gci.api.services import customers as svc

router = APIRouter(tags=["customers"])


def _common_filters(
    search: str | None = Query(None, max_length=32, description="Customer ID contains"),
    segment: str | None = Query(None, max_length=64),
    country: str | None = Query(None, max_length=64),
    activity: str | None = Query(None, description="active_90 | active_365 | inactive_365"),
    sort: str = Query("historical_spend", description=f"One of {list(svc.SORT_COLUMNS)}"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
) -> dict:
    return {
        "search": search,
        "segment": segment,
        "country": country,
        "activity": activity,
        "sort": sort,
        "order": order,
    }


@router.get("/customers", response_model=Paginated[CustomerListItem])
def list_customers(
    filters: dict = Depends(_common_filters),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    return svc.list_customers(db, **filters, page=page, page_size=page_size)


@router.get("/customers/export.csv", response_class=Response)
def export_customers(filters: dict = Depends(_common_filters), db: Session = Depends(get_db)):
    content = svc.export_customers(db, **filters)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="customers.csv"'},
    )


@router.get("/customers/filters", response_model=CustomerFilterOptions)
def filter_options(db: Session = Depends(get_db)) -> dict:
    return svc.filter_options(db)


@router.get("/customers/{customer_id}", response_model=CustomerDetail)
def customer_detail(
    customer_id: str = Path(..., min_length=1, max_length=32), db: Session = Depends(get_db)
) -> dict:
    return svc.customer_detail(db, customer_id)
