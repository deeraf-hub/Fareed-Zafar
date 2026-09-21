"""Staged ingestion: raw records -> validation -> cleaned transactions.

Idempotency: the SHA-256 of the source file is recorded on ``import_runs``; a file whose checksum
already has a *succeeded* run is skipped (recorded as ``skipped_duplicate``) unless ``force``
is given, in which case the earlier run and everything derived from it are replaced.
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from gci.db.models import ImportRun
from gci.db.session import session_scope
from gci.ingest.readers import RAW_FIELDS, read_source, source_kind
from gci.ingest.rules import apply_rules

log = logging.getLogger(__name__)

COPY_CHUNK_ROWS = 200_000


def sha256_of_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def copy_frame(session: Session, table: str, frame: pd.DataFrame) -> None:
    """Bulk-load a DataFrame with PostgreSQL COPY (CSV format, empty field = NULL)."""
    dbapi_conn = session.connection().connection.dbapi_connection
    columns = ", ".join(frame.columns)
    with dbapi_conn.cursor() as cursor:
        for start in range(0, len(frame), COPY_CHUNK_ROWS):
            chunk = frame.iloc[start : start + COPY_CHUNK_ROWS]
            buffer = io.StringIO()
            chunk.to_csv(
                buffer, index=False, header=False, na_rep="", date_format="%Y-%m-%d %H:%M:%S"
            )
            with cursor.copy(f"COPY {table} ({columns}) FROM STDIN WITH (FORMAT csv)") as copy:
                copy.write(buffer.getvalue())


def _allocate_ids(session: Session, sequence: str, count: int) -> list[int]:
    if count == 0:
        return []
    rows = session.execute(
        text(f"SELECT nextval('{sequence}') FROM generate_series(1, :n)"), {"n": count}
    )
    return [int(r[0]) for r in rows]


def _json_list(values: pd.Series) -> pd.Series:
    return values.map(lambda v: json.dumps(list(v)) if len(v) else None)


def import_file(path: Path, *, force: bool = False) -> ImportRun:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)
    checksum = sha256_of_file(path)
    size = path.stat().st_size
    started = datetime.now(UTC)

    with session_scope() as session:
        existing = session.scalar(
            select(ImportRun).where(
                ImportRun.file_sha256 == checksum, ImportRun.status == "succeeded"
            )
        )
        if existing is not None and not force:
            run = ImportRun(
                source_path=str(path),
                source_kind=source_kind(path),
                file_sha256=checksum,
                file_size_bytes=size,
                started_at=started,
                finished_at=datetime.now(UTC),
                status="skipped_duplicate",
                rows_read=0,
                rows_accepted=0,
                rows_excluded=0,
                rows_flagged=0,
                error_message=f"Identical file already imported in run {existing.id}",
            )
            session.add(run)
            session.flush()
            log.info(
                "import skipped: identical checksum",
                extra={"sha256": checksum, "previous_run": existing.id},
            )
            return run
        if existing is not None and force:
            log.info("import forced: replacing run", extra={"previous_run": existing.id})
            session.delete(existing)
            session.flush()

    run_id: int | None = None
    try:
        with session_scope() as session:
            run = ImportRun(
                source_path=str(path),
                source_kind=source_kind(path),
                file_sha256=checksum,
                file_size_bytes=size,
                started_at=started,
                status="running",
            )
            session.add(run)
            session.flush()
            run_id = run.id
            _load_into_run(session, run, path)
            run.finished_at = datetime.now(UTC)
            run.status = "succeeded"
            session.flush()
            log.info(
                "import succeeded",
                extra={
                    "run_id": run.id,
                    "rows_read": run.rows_read,
                    "rows_accepted": run.rows_accepted,
                    "rows_excluded": run.rows_excluded,
                },
            )
            return run
    except Exception as exc:  # record the failure in its own transaction, then re-raise
        with session_scope() as session:
            session.add(
                ImportRun(
                    source_path=str(path),
                    source_kind=source_kind(path),
                    file_sha256=checksum,
                    file_size_bytes=size,
                    started_at=started,
                    finished_at=datetime.now(UTC),
                    status="failed",
                    rows_read=0,
                    rows_accepted=0,
                    rows_excluded=0,
                    rows_flagged=0,
                    error_message=f"{type(exc).__name__}: {exc}"[:2000],
                )
            )
        log.exception("import failed", extra={"run_id": run_id})
        raise


def _load_into_run(session: Session, run: ImportRun, path: Path) -> None:
    frames = []
    for order, sheet in enumerate(read_source(path)):
        frame = sheet.frame.copy()
        frame["sheet_name"] = sheet.name
        frame["sheet_order"] = order
        frames.append(frame)
        log.info("sheet read", extra={"sheet": sheet.name, "rows": len(frame)})
    if not frames:
        raise ValueError("Source contains no data rows")
    raw = pd.concat(frames, ignore_index=True)

    result = apply_rules(raw[RAW_FIELDS], raw["sheet_order"])
    n = len(raw)
    raw_ids = _allocate_ids(session, "raw_transactions_id_seq", n)

    raw_out = pd.DataFrame(
        {
            "id": raw_ids,
            "import_run_id": run.id,
            "sheet_name": raw["sheet_name"],
            "sheet_row": raw["sheet_row"].astype(int),
            **{f"{field}_raw": raw[field] for field in RAW_FIELDS},
            "row_hash": result.row_hash,
            "validation_status": result.status,
            "exclusion_reasons": _json_list(result.exclusion_reasons),
            "flags": _json_list(result.flags),
        }
    )
    copy_frame(session, "raw_transactions", raw_out)

    accepted = (result.status == "accepted").to_numpy()
    typed = result.typed.loc[accepted].copy()
    tx_ids = _allocate_ids(session, "transactions_id_seq", int(accepted.sum()))
    tx_out = pd.DataFrame(
        {
            "id": tx_ids,
            "raw_transaction_id": pd.Series(raw_ids, index=raw.index).loc[accepted].to_numpy(),
            "import_run_id": run.id,
            "invoice": typed["invoice"].to_numpy(),
            "stock_code": typed["stock_code"].to_numpy(),
            "description": typed["description"].to_numpy(),
            "quantity": typed["quantity"].astype("int64").to_numpy(),
            "invoice_date": typed["invoice_date"].to_numpy(),
            "unit_price": typed["unit_price"].to_numpy(),
            "customer_id": typed["customer_id"].to_numpy(),
            "country": typed["country"].to_numpy(),
            "line_amount": typed["line_amount"].to_numpy(),
            "is_cancellation": typed["is_cancellation"].to_numpy(),
            "is_non_product": typed["is_non_product"].to_numpy(),
            "is_anonymous": typed["is_anonymous"].to_numpy(),
            "is_duplicate": typed["is_duplicate"].to_numpy(),
            "is_eligible_sale": typed["is_eligible_sale"].to_numpy(),
            "is_eligible_return": typed["is_eligible_return"].to_numpy(),
        }
    )
    copy_frame(session, "transactions", tx_out)

    exclusions = Counter(r for reasons in result.exclusion_reasons for r in reasons)
    flags = Counter(f for flags_ in result.flags for f in flags_)
    sheets_meta = []
    for order, sheet_frame in enumerate(frames):
        mask = (raw["sheet_order"] == order).to_numpy()
        dates = result.typed.loc[mask, "invoice_date"].dropna()
        sheets_meta.append(
            {
                "name": sheet_frame["sheet_name"].iloc[0],
                "rows": int(mask.sum()),
                "accepted": int((result.status.to_numpy()[mask] == "accepted").sum()),
                "first_date": dates.min().isoformat() if len(dates) else None,
                "last_date": dates.max().isoformat() if len(dates) else None,
            }
        )
    run.rows_read = n
    run.rows_accepted = int(accepted.sum())
    run.rows_excluded = int(n - accepted.sum())
    run.rows_flagged = int(sum(1 for f, a in zip(result.flags, accepted, strict=True) if a and f))
    run.sheets = sheets_meta
    run.validation_summary = {"exclusions": dict(exclusions), "flags": dict(flags)}
