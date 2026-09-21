"""Data-quality report: accepted / excluded / flagged rows, duplicates, coverage.

Used by the API (``/data-quality``), the CLI (``gci quality-report``) and notebook 01.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from gci.ingest.rules import CLEANING_RULES, EXCLUSION_LABELS, FLAG_LABELS

DATASET_NAME = "Online Retail II (UCI Machine Learning Repository)"
DATASET_URL = "https://archive.ics.uci.edu/dataset/502/online+retail+ii"
DATASET_ATTRIBUTION = (
    "Chen, D. (2019). Online Retail II [Dataset]. UCI Machine Learning Repository. "
    "https://doi.org/10.24432/C5CG6D"
)
DATASET_LICENSE = "CC BY 4.0"

_NUMERIC = r"^-?\d+(\.\d+)?$"


def _scalar(session: Session, sql: str, **params) -> object:
    return session.execute(text(sql), params).scalar()


def dataset_info(session: Session) -> dict:
    row = session.execute(
        text(
            "SELECT min(invoice_date), max(invoice_date) FROM transactions "
            "WHERE is_eligible_sale OR is_eligible_return"
        )
    ).one()
    first, last = row
    last_processed = _scalar(
        session,
        "SELECT max(finished_at) FROM import_runs WHERE status = 'succeeded'",
    )
    latest_customers = _scalar(session, "SELECT max(updated_at) FROM customers")
    if latest_customers and (last_processed is None or latest_customers > last_processed):
        last_processed = latest_customers
    return {
        "name": DATASET_NAME,
        "source_url": DATASET_URL,
        "attribution": DATASET_ATTRIBUTION,
        "license": DATASET_LICENSE,
        "mode": "historical_demo",
        "first_transaction_at": first,
        "last_transaction_at": last,
        "data_cutoff": last.date() if isinstance(last, datetime) else None,
        "last_processed_at": last_processed,
    }


def import_runs(session: Session) -> list[dict]:
    rows = session.execute(
        text(
            "SELECT id, source_path, source_kind, file_sha256, file_size_bytes, started_at, "
            "finished_at, status, rows_read, rows_accepted, rows_excluded, rows_flagged, "
            "sheets, error_message FROM import_runs ORDER BY started_at DESC"
        )
    ).mappings()
    return [dict(r) for r in rows]


def quality_report(session: Session) -> dict:
    succeeded = "SELECT id FROM import_runs WHERE status = 'succeeded'"
    totals = (
        session.execute(
            text(
                f"""
            SELECT count(*) AS rows_read,
                   count(*) FILTER (WHERE validation_status = 'accepted') AS rows_accepted,
                   count(*) FILTER (WHERE validation_status = 'excluded') AS rows_excluded,
                   count(*) FILTER (WHERE validation_status = 'accepted'
                                      AND flags IS NOT NULL) AS rows_flagged
            FROM raw_transactions WHERE import_run_id IN ({succeeded})
            """
            )
        )
        .mappings()
        .one()
    )
    rows_read = int(totals["rows_read"] or 0)

    def reason_counts(column: str, labels: dict[str, str]) -> list[dict]:
        rows = session.execute(
            text(
                f"""
                SELECT r.reason, count(*) AS rows
                FROM raw_transactions rt, jsonb_array_elements_text(rt.{column}) AS r(reason)
                WHERE rt.import_run_id IN ({succeeded})
                GROUP BY r.reason ORDER BY rows DESC
                """
            )
        ).mappings()
        return [
            {
                "reason": r["reason"],
                "label": labels.get(r["reason"], r["reason"]),
                "rows": int(r["rows"]),
                "share": (int(r["rows"]) / rows_read) if rows_read else 0.0,
            }
            for r in rows
        ]

    missing = []
    for field in (
        "invoice",
        "stock_code",
        "description",
        "quantity",
        "invoice_date",
        "unit_price",
        "customer_id",
        "country",
    ):
        n = int(
            _scalar(
                session,
                f"SELECT count(*) FROM raw_transactions WHERE {field}_raw IS NULL "
                f"AND import_run_id IN ({succeeded})",
            )
            or 0
        )
        missing.append(
            {"field": field, "missing_rows": n, "share": (n / rows_read) if rows_read else 0.0}
        )

    dup = (
        session.execute(
            text(
                f"""
            WITH dups AS (
                SELECT invoice_raw, customer_id_raw, quantity_raw, unit_price_raw,
                       (exclusion_reasons ? 'duplicate_cross_sheet') AS cross_sheet
                FROM raw_transactions
                WHERE import_run_id IN ({succeeded})
                  AND (exclusion_reasons ? 'duplicate_cross_sheet'
                       OR flags ? 'duplicate_within_sheet')
            )
            SELECT count(*) AS rows,
                   count(*) FILTER (WHERE cross_sheet) AS cross_sheet_rows,
                   count(DISTINCT invoice_raw) AS invoices,
                   avg((customer_id_raw IS NOT NULL)::int) AS with_customer_share,
                   coalesce(sum(CASE WHEN quantity_raw ~ :num AND unit_price_raw ~ :num
                                     AND quantity_raw::numeric > 0
                                THEN quantity_raw::numeric * unit_price_raw::numeric END), 0)
                       AS gross_amount
            FROM dups
            """
            ),
            {"num": _NUMERIC},
        )
        .mappings()
        .one()
    )
    gross_sales = float(
        _scalar(
            session,
            "SELECT coalesce(sum(line_amount), 0) FROM transactions WHERE is_eligible_sale",
        )
        or 0
    )
    duplicates = None
    if rows_read:
        dup_rows = int(dup["rows"] or 0)
        cross = int(dup["cross_sheet_rows"] or 0)
        duplicates = {
            "exact_duplicate_rows": dup_rows,
            "share_of_rows": dup_rows / rows_read,
            "duplicate_gross_amount": float(dup["gross_amount"] or 0),
            "share_of_gross_sales": (
                float(dup["gross_amount"] or 0) / (gross_sales + float(dup["gross_amount"] or 0))
                if gross_sales
                else 0.0
            ),
            "invoices_affected": int(dup["invoices"] or 0),
            "duplicate_rows_with_customer_share": float(dup["with_customer_share"] or 0),
            "decision": (
                f"{cross:,} duplicate rows are the 1-9 December 2010 overlap between the two "
                f"worksheets and are excluded as loading artefacts. The remaining "
                f"{dup_rows - cross:,} rows repeat an earlier line in the same sheet "
                "(same invoice, "
                "product, quantity, price and timestamp); they are kept in the cleaned table but "
                "flagged and left out of sales, returns and modelling, because the source gives no "
                "way to tell a re-scanned line from a genuine second line. Their value is reported "
                "above so the decision can be revisited with the client."
            ),
        }

    cancellations = (
        session.execute(
            text(
                "SELECT count(*) FILTER (WHERE is_cancellation) AS invoices, "
                "coalesce(sum(return_amount), 0) AS return_amount FROM orders"
            )
        )
        .mappings()
        .one()
    )
    cancellation_lines = int(
        _scalar(session, "SELECT count(*) FROM transactions WHERE is_cancellation") or 0
    )
    anonymous = (
        session.execute(
            text(
                "SELECT count(*) AS lines, "
                "coalesce(sum(line_amount) FILTER (WHERE is_eligible_sale), 0)"
                " AS gross FROM transactions WHERE is_anonymous"
            )
        )
        .mappings()
        .one()
    )

    return {
        "dataset": dataset_info(session),
        "imports": import_runs(session),
        "rows_read": rows_read,
        "rows_accepted": int(totals["rows_accepted"] or 0),
        "rows_excluded": int(totals["rows_excluded"] or 0),
        "rows_flagged": int(totals["rows_flagged"] or 0),
        "exclusion_reasons": reason_counts("exclusion_reasons", EXCLUSION_LABELS),
        "flags": reason_counts("flags", FLAG_LABELS),
        "missing_values": missing,
        "duplicates": duplicates,
        "cancellation_invoices": int(cancellations["invoices"] or 0),
        "cancellation_lines": cancellation_lines,
        "return_amount": float(cancellations["return_amount"] or 0),
        "anonymous_lines": int(anonymous["lines"] or 0),
        "anonymous_gross_sales": float(anonymous["gross"] or 0),
        "countries": int(_scalar(session, "SELECT count(DISTINCT country) FROM orders") or 0),
        "products": int(
            _scalar(session, "SELECT count(*) FROM products WHERE NOT is_non_product") or 0
        ),
        "identified_customers": int(
            _scalar(session, "SELECT count(*) FROM customers WHERE order_count > 0") or 0
        ),
        "eligible_positive_orders": int(
            _scalar(session, "SELECT count(*) FROM orders WHERE is_eligible_positive") or 0
        ),
        "cleaning_rules": CLEANING_RULES,
    }


def render_markdown(report: dict) -> str:
    d = report["dataset"]
    lines = [
        "# Data quality report",
        "",
        f"Source: {d['name']} - {d['source_url']} ({d['license']})",
        f"Coverage: {d['first_transaction_at']} to {d['last_transaction_at']}",
        f"Last processed: {d['last_processed_at']}",
        "",
        "## Rows",
        "",
        "| Metric | Rows |",
        "|---|---:|",
        f"| Read | {report['rows_read']:,} |",
        f"| Accepted | {report['rows_accepted']:,} |",
        f"| Excluded (quarantined) | {report['rows_excluded']:,} |",
        f"| Accepted but flagged | {report['rows_flagged']:,} |",
        "",
        "## Exclusion reasons",
        "",
        "| Reason | Rows | Share |",
        "|---|---:|---:|",
    ]
    lines += [
        f"| {r['label']} | {r['rows']:,} | {r['share']:.2%} |" for r in report["exclusion_reasons"]
    ]
    lines += ["", "## Flags (rows kept)", "", "| Flag | Rows | Share |", "|---|---:|---:|"]
    lines += [f"| {r['label']} | {r['rows']:,} | {r['share']:.2%} |" for r in report["flags"]]
    lines += ["", "## Missing values", "", "| Field | Missing rows | Share |", "|---|---:|---:|"]
    lines += [
        f"| {m['field']} | {m['missing_rows']:,} | {m['share']:.2%} |"
        for m in report["missing_values"]
    ]
    if report["duplicates"]:
        dup = report["duplicates"]
        lines += [
            "",
            "## Duplicate investigation",
            "",
            f"- Exact duplicate rows: {dup['exact_duplicate_rows']:,} "
            f"({dup['share_of_rows']:.2%} of rows)",
            f"- Positive-quantity value of duplicates: GBP {dup['duplicate_gross_amount']:,.2f} "
            f"({dup['share_of_gross_sales']:.2%} of gross sales before removal)",
            f"- Invoices affected: {dup['invoices_affected']:,}",
            f"- Share of duplicate rows with a customer ID: "
            f"{dup['duplicate_rows_with_customer_share']:.1%}",
            f"- Decision: {dup['decision']}",
        ]
    lines += [
        "",
        "## Returns, anonymity and coverage",
        "",
        f"- Cancellation invoices: {report['cancellation_invoices']:,} "
        f"({report['cancellation_lines']:,} lines), recorded returns GBP "
        f"{report['return_amount']:,.2f}",
        f"- Anonymous lines: {report['anonymous_lines']:,} "
        f"(gross sales GBP {report['anonymous_gross_sales']:,.2f}) "
        "kept in aggregate reporting only",
        f"- Countries: {report['countries']}, products: {report['products']:,}, identified "
        f"customers with an eligible order: {report['identified_customers']:,}, eligible positive "
        f"orders: {report['eligible_positive_orders']:,}",
        "",
        "## Cleaning rules",
        "",
    ]
    lines += [f"- **{r['rule']}.** {r['detail']}" for r in report["cleaning_rules"]]
    return "\n".join(lines) + "\n"
