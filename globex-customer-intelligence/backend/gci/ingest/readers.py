"""Read the source workbook or CSV into raw (all-text) records, one frame per sheet.

Column names are normalised so both the UCI "Online Retail II" header
(``Invoice, StockCode, Description, Quantity, InvoiceDate, Price, Customer ID, Country``)
and the older "Online Retail" header (``InvoiceNo, ..., UnitPrice, CustomerID``) map onto the
same eight fields.
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

import pandas as pd

RAW_FIELDS = [
    "invoice",
    "stock_code",
    "description",
    "quantity",
    "invoice_date",
    "unit_price",
    "customer_id",
    "country",
]

_HEADER_ALIASES = {
    "invoice": "invoice",
    "invoiceno": "invoice",
    "invoicenumber": "invoice",
    "stockcode": "stock_code",
    "productcode": "stock_code",
    "description": "description",
    "productdescription": "description",
    "quantity": "quantity",
    "invoicedate": "invoice_date",
    "date": "invoice_date",
    "price": "unit_price",
    "unitprice": "unit_price",
    "customerid": "customer_id",
    "customer": "customer_id",
    "country": "country",
}


class SourceFormatError(ValueError):
    pass


@dataclass
class SheetFrame:
    name: str
    frame: pd.DataFrame  # columns RAW_FIELDS (+ sheet_row), every value str or None


def normalise_header(columns: list[object]) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for idx, col in enumerate(columns):
        key = re.sub(r"[^a-z0-9]", "", str(col).strip().lower())
        if key in _HEADER_ALIASES:
            mapping[idx] = _HEADER_ALIASES[key]
    missing = set(RAW_FIELDS) - set(mapping.values())
    if missing:
        raise SourceFormatError(
            f"Source is missing expected columns {sorted(missing)}; found {list(columns)}"
        )
    return mapping


def _cell_to_text(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and value != value:  # NaN
        return None
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value)
    return text if text.strip() != "" else None


def read_xlsx(path: Path) -> Iterator[SheetFrame]:
    import openpyxl

    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        for worksheet in workbook.worksheets:
            rows = worksheet.iter_rows(values_only=True)
            header = next(rows, None)
            if header is None:
                continue
            mapping = normalise_header(list(header))
            records: list[list[str | None]] = []
            for sheet_row, row in enumerate(rows, start=1):
                if row is None or all(v is None for v in row):
                    continue
                record: dict[str, str | None] = dict.fromkeys(RAW_FIELDS)
                for idx, field in mapping.items():
                    record[field] = _cell_to_text(row[idx]) if idx < len(row) else None
                records.append([sheet_row, *[record[f] for f in RAW_FIELDS]])
            frame = pd.DataFrame(records, columns=["sheet_row", *RAW_FIELDS], dtype=object)
            frame["sheet_row"] = frame["sheet_row"].astype(int)
            yield SheetFrame(name=worksheet.title, frame=frame)
    finally:
        workbook.close()


def read_csv(path: Path) -> Iterator[SheetFrame]:
    frame = pd.read_csv(path, dtype=str, keep_default_na=False, encoding_errors="replace")
    mapping = normalise_header(list(frame.columns))
    out = pd.DataFrame(index=frame.index)
    for idx, field in mapping.items():
        out[field] = frame.iloc[:, idx].map(lambda v: _cell_to_text(v))
    out.insert(0, "sheet_row", range(1, len(out) + 1))
    out = out[["sheet_row", *RAW_FIELDS]].astype(object)
    out["sheet_row"] = out["sheet_row"].astype(int)
    yield SheetFrame(name=path.name, frame=out)


def read_source(path: Path) -> Iterator[SheetFrame]:
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xlsm"}:
        yield from read_xlsx(path)
    elif suffix in {".csv", ".txt"}:
        yield from read_csv(path)
    else:
        raise SourceFormatError(f"Unsupported source type '{suffix}'. Use .xlsx or .csv.")


def source_kind(path: Path) -> str:
    return "xlsx" if path.suffix.lower() in {".xlsx", ".xlsm"} else "csv"
