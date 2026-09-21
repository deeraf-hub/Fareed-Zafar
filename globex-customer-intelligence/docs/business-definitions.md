# Business definitions

These definitions are implemented in code (`backend/gci/ingest/rules.py`, `backend/gci/ingest/analytics.py`,
`backend/gci/api/sql/*.sql`) and shown in the application. All money is GBP, as in the source data.

## Eligibility

| Term | Definition |
|---|---|
| **Eligible sale (line)** | An accepted, non-duplicate product line with positive quantity and positive unit price on a non-cancellation invoice. |
| **Eligible return (line)** | An accepted, non-duplicate product line with negative quantity and positive unit price on a cancellation invoice (invoice starts with `C`). |
| **Non-product line** | Postage, carriage, manual adjustments, discounts, samples, bank charges, Amazon fees, commission, test items and gift vouchers. Kept in the cleaned table, excluded from sales, returns and features. |
| **Eligible positive order** | A non-cancellation invoice whose eligible sales total is greater than zero. |
| **Identified customer** | A customer ID present in the source. Anonymous lines are never assigned an identity. |

## Metrics

| Metric | Definition | Where computed |
|---|---|---|
| **Gross sales** | Sum of eligible sale line amounts (quantity x unit price) in the period, before recorded returns. Includes anonymous orders. | `overview_kpis.sql` |
| **Net revenue** | Gross sales plus recorded eligible return amounts (negative) in the period, under the cleaning rules above. | `overview_kpis.sql` |
| **Orders** | Count of eligible positive orders in the period. | `overview_kpis.sql` |
| **Purchasing customers** | Identified customers with at least one eligible positive order in the period. | `overview_kpis.sql` |
| **Average order value** | Gross sales divided by eligible positive orders. | API |
| **Repeat-purchase rate** | Share of purchasing customers with two or more eligible positive orders in the period. | `overview_kpis.sql` |
| **Return rate** | Recorded returns as a share of gross sales (shown as a positive percentage). | API |
| **Cohort repeat rate** | For customers whose first eligible purchase fell in a cohort month, the share active (any eligible order) *n* months later. | `cohort_repeat_rates.sql` |

## RFM features (customer level, at a cutoff date)

| Feature | Definition |
|---|---|
| **Recency** | Days between the last eligible positive order before the cutoff and the cutoff. |
| **Frequency** | Number of eligible positive orders in the 365-day lookback before the cutoff. |
| **Monetary value** | Eligible spending (gross) in the 365-day lookback before the cutoff. |

## Prediction wording

* **30-day repeat-purchase likelihood**: the probability that an identified customer with at least one
  eligible order before the cutoff places an eligible positive order in the 30 days starting at the cutoff.
  Customers are never described as "churned".
* **Predicted 30-day purchase spending**: the model's expected eligible spending in the same window,
  including zero for customers who do not purchase. It is not guaranteed revenue and not a lifetime value.
* The application does not claim that prioritising outreach changes purchasing. That would need an
  experiment (for example a randomised hold-out), which this historical dataset cannot provide.

## Cutoffs and periods

* Snapshots are taken on the first day of each month from March 2010 to November 2011 (labelled) and on
  10 December 2011, the day after the last transaction (scoring snapshot, unlabelled).
* Chronological splits: training March 2010 to May 2011, validation June to August 2011, final test
  September to November 2011. Snapshots whose outcome window would cross into the next period are purged.
* "As of 10 December 2011" is shown wherever a prediction appears. Nothing in the app is live data.
