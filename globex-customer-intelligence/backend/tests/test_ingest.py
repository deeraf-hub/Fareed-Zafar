from __future__ import annotations

from sqlalchemy import select, text

from gci.db.models import ImportRun, RawTransaction, Transaction
from gci.db.session import session_scope
from gci.ingest.importer import import_file
from gci.ingest.rules import normalise_customer_id


def _raw_by_invoice(session, invoice: str, stock_code: str | None = None):
    stmt = select(RawTransaction).where(RawTransaction.invoice_raw == invoice)
    if stock_code:
        stmt = stmt.where(RawTransaction.stock_code_raw == stock_code)
    return session.scalars(stmt.order_by(RawTransaction.id)).all()


def test_import_is_idempotent_by_checksum(tiny_workbook):
    first = import_file(tiny_workbook)
    assert first.status == "succeeded"
    assert first.rows_read == 14
    with session_scope() as s:
        raw_before = s.execute(text("SELECT count(*) FROM raw_transactions")).scalar()
        tx_before = s.execute(text("SELECT count(*) FROM transactions")).scalar()

    second = import_file(tiny_workbook)
    assert second.status == "skipped_duplicate"
    assert second.rows_read == 0
    with session_scope() as s:
        assert s.execute(text("SELECT count(*) FROM raw_transactions")).scalar() == raw_before
        assert s.execute(text("SELECT count(*) FROM transactions")).scalar() == tx_before
        runs = s.scalars(select(ImportRun).order_by(ImportRun.id)).all()
        assert [r.status for r in runs] == ["succeeded", "skipped_duplicate"]
        assert runs[0].file_sha256 == runs[1].file_sha256

    forced = import_file(tiny_workbook, force=True)
    assert forced.status == "succeeded"
    with session_scope() as s:
        assert s.execute(text("SELECT count(*) FROM raw_transactions")).scalar() == raw_before
        assert (
            s.execute(text("SELECT count(*) FROM import_runs WHERE status='succeeded'")).scalar()
            == 1
        )


def test_validation_reasons_and_flags(tiny_workbook):
    run = import_file(tiny_workbook)
    assert run.sheets[0]["name"] == "Year A" and run.sheets[1]["name"] == "Year B"
    with session_scope() as s:
        assert _raw_by_invoice(s, "489440")[0].exclusion_reasons == ["invalid_date"]
        assert _raw_by_invoice(s, "489441")[0].exclusion_reasons == ["zero_quantity"]
        zero_price = _raw_by_invoice(s, "489439")[0]
        assert zero_price.exclusion_reasons == ["non_positive_price"]
        assert "negative_quantity_not_cancellation" in zero_price.flags
        assert "anonymous" in zero_price.flags

        dup_rows = _raw_by_invoice(s, "489436", "22350")
        assert [r.validation_status for r in dup_rows] == ["accepted", "accepted", "excluded"]
        assert dup_rows[1].flags == ["duplicate_within_sheet"]
        assert dup_rows[2].exclusion_reasons == ["duplicate_cross_sheet"]
        assert dup_rows[2].sheet_name == "Year B"

        post = s.scalar(select(Transaction).where(Transaction.stock_code == "POST"))
        assert post.is_non_product and not post.is_eligible_sale
        ret = s.scalar(select(Transaction).where(Transaction.invoice == "C489437"))
        assert ret.is_cancellation and ret.is_eligible_return and float(ret.line_amount) == -5.1
        anon = s.scalar(select(Transaction).where(Transaction.invoice == "489438"))
        assert anon.is_anonymous and anon.customer_id is None and anon.is_eligible_sale

    assert run.rows_excluded == 4  # invalid date, zero qty, zero price, cross-sheet duplicate
    assert run.rows_accepted == 10
    assert run.validation_summary["exclusions"]["duplicate_cross_sheet"] == 1


def test_identifiers_are_preserved_as_strings(tiny_workbook):
    import_file(tiny_workbook)
    with session_scope() as s:
        ids = set(s.scalars(select(Transaction.customer_id).distinct()))
    assert ids == {"13085", "13086", "13087", None}
    assert normalise_customer_id("13085.0") == "13085"
    assert normalise_customer_id("ABC-1") == "ABC-1"
    assert normalise_customer_id("") is None
