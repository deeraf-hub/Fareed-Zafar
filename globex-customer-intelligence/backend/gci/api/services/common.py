from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

from gci.db.models import ModelRun
from gci.ml.tracking import active_run


def date_bounds(session: Session) -> tuple[date, date] | None:
    row = session.execute(
        text("SELECT min(order_at), max(order_at) FROM orders WHERE is_eligible_positive")
    ).one()
    if row[0] is None:
        return None
    return row[0].date(), row[1].date()


def period_bounds(session: Session, start: date | None, end: date | None) -> tuple[date, date]:
    bounds = date_bounds(session)
    if bounds is None:
        today = date.today()
        return start or today, end or today
    lo, hi = bounds
    return start or lo, end or hi


def end_exclusive(end: date) -> datetime:
    return datetime.combine(end + timedelta(days=1), datetime.min.time())


def start_inclusive(start: date) -> datetime:
    return datetime.combine(start, datetime.min.time())


def active_runs(session: Session) -> dict[str, ModelRun | None]:
    return {t: active_run(session, t) for t in ("segmentation", "classification", "regression")}


def unavailable(reason: str) -> dict:
    return {
        "status": "unavailable",
        "value": None,
        "cutoff_date": None,
        "model_version": None,
        "rank": None,
        "reason": reason,
    }


def available(value: float, cutoff: date, model_version: str, rank: int | None) -> dict:
    return {
        "status": "available",
        "value": float(value),
        "cutoff_date": cutoff,
        "model_version": model_version,
        "rank": rank,
        "reason": None,
    }
