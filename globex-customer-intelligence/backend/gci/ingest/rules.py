"""Validation and cleaning rules (the single source of truth, also rendered in the UI).

Two kinds of outcome:

* **Exclusion reasons** - the row fails validation and is quarantined in ``raw_transactions``
  with ``validation_status='excluded'``. It never reaches ``transactions``.
* **Flags** - the row is valid and kept, but the flag changes how it is used downstream
  (for example cancellations count as returns, non-product charges never count as sales).

Every rule is documented in ``CLEANING_RULES`` so the API and the Data Quality screen show the
same text that the code implements.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

import numpy as np
import pandas as pd

from gci.ingest.readers import RAW_FIELDS

# Plausible invoice dates: not before 2000 and not in the future (checked at import time).
MIN_DATE = pd.Timestamp("2000-01-01")

# Stock codes that represent charges or adjustments rather than products.
NON_PRODUCT_CODES = {
    "POST",  # postage
    "DOT",  # dotcom postage
    "M",  # manual adjustment
    "C2",  # carriage
    "D",  # discount
    "S",  # samples
    "BANK CHARGES",
    "ADJUST",
    "ADJUST2",
    "AMAZONFEE",
    "CRUK",  # charity commission
    "B",  # adjust bad debt
    "C3",
    "GIFT",
}
NON_PRODUCT_PATTERNS = (re.compile(r"^TEST\d*$"), re.compile(r"^GIFT_\d+_\d+$"))

EXCLUSION_LABELS = {
    "missing_invoice": "Missing invoice identifier",
    "missing_stock_code": "Missing product code",
    "invalid_quantity": "Quantity missing or not a whole number",
    "zero_quantity": "Quantity is zero",
    "invalid_date": "Invoice date missing or unparseable",
    "date_out_of_range": "Invoice date before 2000 or in the future",
    "invalid_price": "Unit price missing or not numeric",
    "non_positive_price": "Unit price is zero or negative",
    "duplicate_cross_sheet": "Exact copy of a row already loaded from an earlier sheet (overlap)",
}

FLAG_LABELS = {
    "cancellation": "Cancellation invoice (invoice starts with C)",
    "adjustment_invoice": "Adjustment invoice (invoice starts with A)",
    "non_product": "Non-product charge or adjustment (postage, manual, discount, fees)",
    "anonymous": "No customer identifier",
    "missing_description": "Missing product description",
    "negative_quantity_not_cancellation": "Negative quantity outside a cancellation invoice",
    "positive_quantity_on_cancellation": "Positive quantity on a cancellation invoice",
    "duplicate_within_sheet": "Exact duplicate of an earlier row in the same sheet",
}

CLEANING_RULES: list[dict[str, str]] = [
    {
        "rule": "Identifiers are text",
        "detail": "Invoice, stock code and customer ID are stored as strings; numeric customer "
        "IDs such as 13085.0 become '13085'. Stock codes are upper-cased and trimmed.",
    },
    {
        "rule": "Validation exclusions",
        "detail": "Rows with a missing invoice or stock code, a non-integer or zero quantity, an "
        "unparseable date, a date before 2000 or in the future, or a unit price that is missing, "
        "zero or negative are quarantined with the reason recorded. They never enter reporting.",
    },
    {
        "rule": "Sheet overlap duplicates",
        "detail": "The UCI workbook's two sheets both contain 1-9 December 2010. A row identical "
        "to one already loaded from an earlier sheet is excluded as 'duplicate_cross_sheet'.",
    },
    {
        "rule": "Within-sheet duplicates",
        "detail": "Rows identical in all eight fields to an earlier row in the same sheet are "
        "kept in the cleaned table but flagged and excluded from sales, returns and modelling. "
        "Their value is reported in the duplicate investigation so the decision can be revisited.",
    },
    {
        "rule": "Cancellations and returns",
        "detail": "Invoices starting with 'C' are cancellations. Their product lines with a "
        "negative quantity and positive price are recorded returns and reduce net revenue.",
    },
    {
        "rule": "Non-product charges",
        "detail": "Postage, carriage, manual adjustments, discounts, samples, bank charges, "
        "Amazon fees, commission, test items and gift vouchers are flagged as non-product and "
        "excluded from gross sales, returns and customer-level features.",
    },
    {
        "rule": "Anonymous transactions",
        "detail": "Lines without a customer ID stay in aggregate reporting (sales, revenue, "
        "orders) but are excluded from customer tables, segmentation and predictions. Missing "
        "IDs are never replaced with invented identities.",
    },
    {
        "rule": "Eligible sale / eligible return",
        "detail": "An eligible sale is an accepted, non-duplicate product line with positive "
        "quantity and price on a non-cancellation invoice. An eligible return is the same on a "
        "cancellation invoice with negative quantity.",
    },
]


@dataclass
class RuleResult:
    typed: pd.DataFrame  # typed columns for accepted rows (index aligned to raw frame)
    status: pd.Series  # 'accepted' | 'excluded'
    exclusion_reasons: pd.Series  # list[str] per row
    flags: pd.Series  # list[str] per row
    row_hash: pd.Series


def _hash_row(values: tuple) -> str:
    joined = "\x1f".join("" if v is None else str(v) for v in values)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def normalise_customer_id(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if text == "" or text.lower() in {"nan", "none", "null"}:
        return None
    if re.fullmatch(r"\d+\.0+", text):
        text = text.split(".")[0]
    return text


def normalise_stock_code(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip().upper()
    return text or None


def is_non_product_code(code: str | None) -> bool:
    if code is None:
        return False
    if code in NON_PRODUCT_CODES:
        return True
    return any(p.match(code) for p in NON_PRODUCT_PATTERNS)


def apply_rules(raw: pd.DataFrame, sheet_order: pd.Series) -> RuleResult:
    """Validate and type a raw frame (columns RAW_FIELDS, all text).

    ``sheet_order`` gives the ordinal of the sheet each row came from so cross-sheet duplicates can
    be distinguished from within-sheet duplicates. The frame must be in load order.
    """
    n = len(raw)
    reasons: list[list[str]] = [[] for _ in range(n)]
    flags: list[list[str]] = [[] for _ in range(n)]

    invoice = raw["invoice"].map(lambda v: None if v is None else str(v).strip() or None)
    stock_code = raw["stock_code"].map(normalise_stock_code)
    description = raw["description"].map(lambda v: None if v is None else (str(v).strip() or None))
    quantity = pd.to_numeric(raw["quantity"], errors="coerce")
    invoice_date = pd.to_datetime(raw["invoice_date"], errors="coerce", format="mixed")
    unit_price = pd.to_numeric(raw["unit_price"], errors="coerce")
    customer_id = raw["customer_id"].map(normalise_customer_id)
    country = raw["country"].map(lambda v: None if v is None else (str(v).strip() or None))

    def add(mask: pd.Series, code: str, target: list[list[str]]) -> None:
        for i in np.flatnonzero(mask.to_numpy()):
            target[i].append(code)

    # --- exclusions
    add(invoice.isna(), "missing_invoice", reasons)
    add(stock_code.isna(), "missing_stock_code", reasons)
    bad_qty = quantity.isna() | (quantity != np.floor(quantity.fillna(0)))
    add(bad_qty, "invalid_quantity", reasons)
    add(~bad_qty & (quantity == 0), "zero_quantity", reasons)
    add(invoice_date.isna(), "invalid_date", reasons)
    max_date = pd.Timestamp.now().normalize() + pd.Timedelta(days=1)
    add(
        invoice_date.notna() & ((invoice_date < MIN_DATE) | (invoice_date > max_date)),
        "date_out_of_range",
        reasons,
    )
    add(unit_price.isna(), "invalid_price", reasons)
    add(unit_price.notna() & (unit_price <= 0), "non_positive_price", reasons)

    # --- duplicates (exact match on the eight normalised fields)
    key = pd.DataFrame(
        {
            "invoice": invoice,
            "stock_code": stock_code,
            "description": description,
            "quantity": quantity,
            "invoice_date": invoice_date,
            "unit_price": unit_price,
            "customer_id": customer_id,
            "country": country,
        }
    )
    row_hash = pd.Series(
        [_hash_row(t) for t in key.astype(object).where(key.notna(), None).itertuples(index=False)],
        index=raw.index,
    )
    first_sheet = row_hash.map(
        pd.Series(sheet_order.values, index=row_hash.values).groupby(level=0).first()
    )
    is_dup = row_hash.duplicated(keep="first")
    cross_sheet = is_dup & (sheet_order != first_sheet)
    within_sheet = is_dup & (sheet_order == first_sheet)
    add(cross_sheet, "duplicate_cross_sheet", reasons)
    add(within_sheet, "duplicate_within_sheet", flags)

    # --- flags
    is_cancellation = invoice.fillna("").str.upper().str.startswith("C")
    is_adjustment = invoice.fillna("").str.upper().str.startswith("A")
    non_product = stock_code.map(is_non_product_code).astype(bool)
    anonymous = customer_id.isna()
    add(is_cancellation, "cancellation", flags)
    add(is_adjustment, "adjustment_invoice", flags)
    add(non_product, "non_product", flags)
    add(anonymous, "anonymous", flags)
    add(description.isna(), "missing_description", flags)
    add(~is_cancellation & (quantity < 0), "negative_quantity_not_cancellation", flags)
    add(is_cancellation & (quantity > 0), "positive_quantity_on_cancellation", flags)

    status = pd.Series(
        ["excluded" if r else "accepted" for r in reasons], index=raw.index, dtype=object
    )
    accepted = status == "accepted"
    is_duplicate = pd.Series(within_sheet, index=raw.index)
    eligible_sale = accepted & ~is_cancellation & (quantity > 0) & ~non_product & ~is_duplicate
    eligible_return = accepted & is_cancellation & (quantity < 0) & ~non_product & ~is_duplicate
    typed = pd.DataFrame(
        {
            "invoice": invoice,
            "stock_code": stock_code,
            "description": description,
            "quantity": quantity,
            "invoice_date": invoice_date,
            "unit_price": unit_price,
            "customer_id": customer_id,
            "country": country,
            "line_amount": (quantity * unit_price).round(4),
            "is_cancellation": is_cancellation,
            "is_non_product": non_product,
            "is_anonymous": anonymous,
            "is_duplicate": is_duplicate,
            "is_eligible_sale": eligible_sale,
            "is_eligible_return": eligible_return,
        }
    )
    return RuleResult(
        typed=typed,
        status=status,
        exclusion_reasons=pd.Series(reasons, index=raw.index, dtype=object),
        flags=pd.Series(flags, index=raw.index, dtype=object),
        row_hash=row_hash,
    )


__all__ = [
    "RAW_FIELDS",
    "CLEANING_RULES",
    "EXCLUSION_LABELS",
    "FLAG_LABELS",
    "NON_PRODUCT_CODES",
    "apply_rules",
    "is_non_product_code",
    "normalise_customer_id",
    "normalise_stock_code",
]
