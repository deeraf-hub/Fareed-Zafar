from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy.orm import Session

from gci.db.session import get_session_factory


def get_db() -> Iterator[Session]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.rollback()  # the API is read-only; never leave a transaction open
        session.close()
