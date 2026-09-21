from __future__ import annotations

from functools import lru_cache
from importlib import resources

from sqlalchemy import text
from sqlalchemy.sql.elements import TextClause


@lru_cache
def load_sql(name: str) -> TextClause:
    source = resources.files("gci.api.sql").joinpath(f"{name}.sql").read_text(encoding="utf-8")
    return text(source)
