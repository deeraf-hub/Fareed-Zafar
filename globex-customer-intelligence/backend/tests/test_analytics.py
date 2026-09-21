from __future__ import annotations

from sqlalchemy import text

from gci.db.session import session_scope
from gci.ingest.analytics import build_analytics
from gci.ingest.importer import import_file
from gci.ingest.quality import quality_report


def _scalar(sql: str):
    with session_scope() as s:
        return s.execute(text(sql)).scalar()


def test_revenue_and_returns_follow_documented_rules(tiny_workbook):
    import_file(tiny_workbook)
    counts = build_analytics()
    assert counts["customers"] == 3  # anonymous lines never create a customer
    # eligible sales: 6*6.95 + 12*6.75 + 2*2.55 + 4*2.55 (one copy) + 3*2.55 (anonymous)
    #                 + 10*6.95 + 1*6.95 ; POST excluded; duplicates excluded
    expected_gross = 6 * 6.95 + 12 * 6.75 + 2 * 2.55 + 4 * 2.55 + 3 * 2.55 + 10 * 6.95 + 1 * 6.95
    assert abs(float(_scalar("SELECT sum(gross_amount) FROM orders")) - expected_gross) < 1e-6
    assert abs(float(_scalar("SELECT sum(return_amount) FROM orders")) - (-2 * 2.55)) < 1e-6
    assert _scalar("SELECT count(*) FROM orders WHERE is_eligible_positive") == 6
    assert _scalar("SELECT count(*) FROM orders WHERE is_cancellation") == 1
    with session_scope() as s:
        c = s.execute(text("SELECT * FROM customers WHERE customer_id = '13085'")).mappings().one()
    assert c["order_count"] == 2 and c["return_order_count"] == 1
    assert abs(float(c["gross_sales"]) - (6 * 6.95 + 12 * 6.75 + 2 * 2.55)) < 1e-6
    assert abs(float(c["net_revenue"]) - (6 * 6.95 + 12 * 6.75 + 2 * 2.55 - 5.1)) < 1e-6


def test_customer_aggregates_do_not_double_count(synthetic_csv):
    import_file(synthetic_csv)
    build_analytics()
    orders_total = float(_scalar("SELECT sum(gross_amount) FROM orders"))
    items_total = float(_scalar("SELECT sum(line_amount) FROM order_items WHERE is_eligible_sale"))
    customers_total = float(_scalar("SELECT sum(gross_sales) FROM customers"))
    anonymous_total = float(
        _scalar("SELECT sum(gross_amount) FROM orders WHERE customer_id IS NULL")
    )
    assert abs(orders_total - items_total) < 1e-4
    assert abs(customers_total + anonymous_total - orders_total) < 1e-4
    # A naive join would inflate order totals by the number of lines: prove the grain rule.
    joined = float(
        _scalar(
            "SELECT sum(o.gross_amount) FROM orders o JOIN order_items oi ON oi.invoice = o.invoice"
        )
    )
    assert joined > orders_total
    assert _scalar("SELECT count(*) FROM orders") == _scalar(
        "SELECT count(DISTINCT invoice) FROM order_items"
    )
    assert (
        _scalar(
            "SELECT count(*) FROM customers c WHERE order_count <> "
            "(SELECT count(*) FROM orders o "
            "WHERE o.customer_id = c.customer_id AND o.is_eligible_positive)"
        )
        == 0
    )


def test_quality_report_totals_reconcile(tiny_workbook):
    import_file(tiny_workbook)
    build_analytics()
    with session_scope() as s:
        report = quality_report(s)
    assert report["rows_read"] == report["rows_accepted"] + report["rows_excluded"]
    assert report["duplicates"]["exact_duplicate_rows"] == 2
    assert {r["reason"] for r in report["exclusion_reasons"]} == {
        "invalid_date",
        "zero_quantity",
        "non_positive_price",
        "duplicate_cross_sheet",
    }
    assert report["anonymous_lines"] == 1
    assert report["cancellation_invoices"] == 1
