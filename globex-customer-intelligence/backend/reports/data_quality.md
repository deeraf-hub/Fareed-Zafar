# Data quality report

Source: Online Retail II (UCI Machine Learning Repository) - https://archive.ics.uci.edu/dataset/502/online+retail+ii (CC BY 4.0)
Coverage: 2009-12-01 07:45:00 to 2011-12-09 12:50:00
Last processed: 2026-09-21 19:59:10.162396+00:00

## Rows

| Metric | Rows |
|---|---:|
| Read | 1,067,371 |
| Accepted | 1,038,819 |
| Excluded (quarantined) | 28,552 |
| Accepted but flagged | 262,223 |

## Exclusion reasons

| Reason | Rows | Share |
|---|---:|---:|
| Exact copy of a row already loaded from an earlier sheet (overlap) | 22,523 | 2.11% |
| Unit price is zero or negative | 6,207 | 0.58% |

## Flags (rows kept)

| Flag | Rows | Share |
|---|---:|---:|
| No customer identifier | 243,007 | 22.77% |
| Cancellation invoice (invoice starts with C) | 19,494 | 1.83% |
| Exact duplicate of an earlier row in the same sheet | 11,812 | 1.11% |
| Non-product charge or adjustment (postage, manual, discount, fees) | 5,913 | 0.55% |
| Missing product description | 4,382 | 0.41% |
| Negative quantity outside a cancellation invoice | 3,457 | 0.32% |
| Adjustment invoice (invoice starts with A) | 6 | 0.00% |
| Positive quantity on a cancellation invoice | 1 | 0.00% |

## Missing values

| Field | Missing rows | Share |
|---|---:|---:|
| invoice | 0 | 0.00% |
| stock_code | 0 | 0.00% |
| description | 4,382 | 0.41% |
| quantity | 0 | 0.00% |
| invoice_date | 0 | 0.00% |
| unit_price | 0 | 0.00% |
| customer_id | 243,007 | 22.77% |
| country | 0 | 0.00% |

## Duplicate investigation

- Exact duplicate rows: 34,335 (3.22% of rows)
- Positive-quantity value of duplicates: GBP 496,334.12 (2.46% of gross sales before removal)
- Invoices affected: 5,391
- Share of duplicate rows with a customer ID: 77.1%
- Decision: 22,523 duplicate rows are the 1-9 December 2010 overlap between the two worksheets and are excluded as loading artefacts. The remaining 11,812 rows repeat an earlier line in the same sheet (same invoice, product, quantity, price and timestamp); they are kept in the cleaned table but flagged and left out of sales, returns and modelling, because the source gives no way to tell a re-scanned line from a genuine second line. Their value is reported above so the decision can be revisited with the client.

## Returns, anonymity and coverage

- Cancellation invoices: 8,292 (19,165 lines), recorded returns GBP -716,462.57
- Anonymous lines: 229,328 (gross sales GBP 2,575,278.90) kept in aggregate reporting only
- Countries: 43, products: 4,739, identified customers with an eligible order: 5,852, eligible positive orders: 39,516

## Cleaning rules

- **Identifiers are text.** Invoice, stock code and customer ID are stored as strings; numeric customer IDs such as 13085.0 become '13085'. Stock codes are upper-cased and trimmed.
- **Validation exclusions.** Rows with a missing invoice or stock code, a non-integer or zero quantity, an unparseable date, a date before 2000 or in the future, or a unit price that is missing, zero or negative are quarantined with the reason recorded. They never enter reporting.
- **Sheet overlap duplicates.** The UCI workbook's two sheets both contain 1-9 December 2010. A row identical to one already loaded from an earlier sheet is excluded as 'duplicate_cross_sheet'.
- **Within-sheet duplicates.** Rows identical in all eight fields to an earlier row in the same sheet are kept in the cleaned table but flagged and excluded from sales, returns and modelling. Their value is reported in the duplicate investigation so the decision can be revisited.
- **Cancellations and returns.** Invoices starting with 'C' are cancellations. Their product lines with a negative quantity and positive price are recorded returns and reduce net revenue.
- **Non-product charges.** Postage, carriage, manual adjustments, discounts, samples, bank charges, Amazon fees, commission, test items and gift vouchers are flagged as non-product and excluded from gross sales, returns and customer-level features.
- **Anonymous transactions.** Lines without a customer ID stay in aggregate reporting (sales, revenue, orders) but are excluded from customer tables, segmentation and predictions. Missing IDs are never replaced with invented identities.
- **Eligible sale / eligible return.** An eligible sale is an accepted, non-duplicate product line with positive quantity and price on a non-cancellation invoice. An eligible return is the same on a cancellation invoice with negative quantity.
