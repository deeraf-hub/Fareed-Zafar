# Globex Customer Intelligence

An e-commerce analytics application that answers five questions for a store owner or marketing
manager:

1. How is the business performing?
2. Which customer groups behave differently?
3. Which existing customers are likely to purchase within the next 30 days?
4. How much might each customer spend during that period?
5. Which customers should a marketing manager review for follow-up?

It is a **portfolio demonstration by Globex Technology** of a solution a client could commission.
The data is the public **UCI Online Retail II** dataset (UK online gift retailer, December 2009 to
December 2011). It is **not** Globex data and **not** a client engagement, and every screen says so:
the app runs in "Historical dataset demo" mode with the data cutoff (9 December 2011) shown on every
page. Predictions are made "as of 10 December 2011", the latest usable historical cutoff.

> Dataset attribution: Chen, D. (2019). *Online Retail II* [Dataset]. UCI Machine Learning
> Repository. https://doi.org/10.24432/C5CG6D. Licensed under
> [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## What is inside

| Layer | Stack | Folder |
|---|---|---|
| Data pipeline and models | Python 3.11, pandas, NumPy, scikit-learn, MLflow, SQLAlchemy, Alembic | `backend/gci/` |
| API | FastAPI (read-only, documented at `/api/docs`) | `backend/gci/api/` |
| Database | PostgreSQL 16 | `backend/alembic/` |
| Web UI | React 18, TypeScript, Tailwind CSS, Plotly | `frontend/` |
| Notebooks | Jupyter, Matplotlib, Seaborn (executed, outputs included) | `backend/notebooks/` |
| Tests | pytest (backend), Vitest (frontend) | `backend/tests/`, `frontend/src/**/*.test.tsx` |
| Packaging | Docker, Docker Compose, GitHub Actions | `docker-compose.yml`, `../.github/workflows/globex-customer-intelligence.yml` |

Docs: [business definitions](docs/business-definitions.md), [architecture and data dictionary](docs/architecture.md),
[cloud deployment guide](docs/deployment.md), [analytical SQL](backend/gci/api/sql/README.md),
[data-quality report](backend/reports/data_quality.md).

## Quick start with Docker Compose

Requirements: Docker with Compose v2.

```bash
cd globex-customer-intelligence
cp .env.example .env                      # defaults work for local use
docker compose up -d --build              # db + migrations + api + web
docker compose run --rm api gci download  # fetches the UCI workbook into the raw-data volume
docker compose run --rm api gci run-all /data/raw/online_retail_II.xlsx
```

Then open http://localhost:8080 (UI) and http://localhost:8000/api/docs (API).
`run-all` imports (about 2 minutes), builds analytics and features, trains the three models and
writes predictions. Optional MLflow UI: `docker compose --profile mlflow up mlflow` then
http://localhost:5000.

If the UCI download is blocked in your network, copy the workbook yourself into
`backend/data/raw/online_retail_II.xlsx` (it is mounted at `/data/raw`) and run the same
`run-all` command; the importer also accepts a `.csv` export with the same columns.

## Local development (without Docker)

```bash
# 1. PostgreSQL: any local server; create databases `gci` and `gci_test`
# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt && pip install -e .
cp ../.env.example .env                    # then edit DATABASE_URL / TEST_DATABASE_URL
alembic upgrade head                       # apply migrations
gci download --dest data/raw               # or place the workbook manually
gci import-data data/raw/online_retail_II.xlsx
gci build-analytics
gci build-features
gci train                                  # segmentation + classifier + regressor (MLflow-tracked)
gci predict
gci quality-report --out reports/data_quality.md
uvicorn gci.api.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm ci
npm run dev                                # http://localhost:5173, proxies /api to :8000
```

### Every pipeline command

| Command | What it does |
|---|---|
| `gci download [--dest DIR] [--url URL]` | Download and unzip the UCI workbook; verifies the SHA-256 against the published file. |
| `gci import-data PATH [--force]` | Staged import: raw rows (all text) → validation with reasons → cleaned, flagged transactions. Idempotent by file checksum. |
| `gci build-analytics` | Rebuild `products`, `customers`, `orders`, `order_items` with set-based SQL. |
| `gci build-features [--frequency monthly\|weekly]` | Point-in-time customer snapshots with 30-day labels and chronological splits. |
| `gci train-segmentation` / `train-classifier` / `train-regressor` / `train` | Fit and evaluate models; log to MLflow; register the run as active. |
| `gci predict` | Score all eligible customers at the latest usable cutoff with the active models. |
| `gci quality-report [--out FILE]` | Markdown data-quality report. |
| `gci run-all PATH` | All of the above in order. |

Repeat imports of the same file are skipped (`skipped_duplicate`) unless `--force` is given, in
which case the earlier run and everything derived from it are replaced.

## Running the tests

```bash
cd backend && pytest            # needs TEST_DATABASE_URL (a PostgreSQL database that may be emptied)
cd frontend && npm test
```

The backend suite covers idempotent imports, the revenue and return rules, customer aggregation
without double-counting, snapshot and label boundaries, purging of boundary snapshots, leakage
prevention (features unchanged by future data; imputers fitted on training rows only), prediction
reproducibility, API validation and pagination, filter/export consistency, and the
model-unavailable state. CI runs both suites plus a migration up/down/up check and Docker builds.

## How the data is treated

Raw records → validation → cleaned transactions → analytical tables → customer features.

* Raw rows are preserved as text with the import checksum, sheet and row number.
* Rows failing validation are quarantined with explicit reasons (invalid date, non-positive price,
  zero quantity, missing identifiers, cross-sheet duplicates).
* Kept rows carry flags: cancellation, non-product charge, anonymous, within-sheet duplicate.
* Customer and product identifiers are strings; anonymous lines are never assigned an identity and
  stay in aggregate reporting only.
* The workbook's two sheets overlap on 1–9 December 2010; that overlap explains 22,523 of the
  34,335 exact duplicate rows. The remaining 11,812 within-sheet duplicates (worth about 2.5% of gross
  sales) are flagged and excluded from sales and modelling, with the numbers reported so the decision
  can be revisited.

Full rules: [docs/business-definitions.md](docs/business-definitions.md) and the Data Quality screen.

## Modelling summary

Point-in-time snapshots are built on the first of each month (March 2010 to November 2011, 21
labelled cutoffs, 84,030 snapshots for 5,852 identified customers) plus a scoring snapshot on
10 December 2011. Features use only orders before the cutoff; labels come from the following 30
days. Splits are chronological (train to May 2011, validation June to August 2011, test September
to November 2011) and boundary snapshots are purged when their outcome window would cross a split.
Imputers and scalers live inside scikit-learn pipelines; hyper-parameters and thresholds are chosen
on validation; the test period is scored once.

Results on the held-out test period (16,269 snapshots, three autumn-2011 cutoffs), from the
active runs stored in `model_runs`:

| Model | Selected | Baseline | Key test metrics |
|---|---|---|---|
| Segmentation | K-means, k=6 on log-scaled RFM | k=3..7 compared | silhouette 0.52, bootstrap ARI 0.99; segments named from cluster medians (e.g. "Recent top-value": 7% of customers, 52% of lookback spending) |
| 30-day repeat-purchase classifier | Histogram gradient boosting | Prior-rate dummy (AP = base rate 0.22) and logistic regression | AP 0.58, ROC-AUC 0.79, precision 0.90 among the top 100 per cutoff (lift 4.0x), Brier 0.138; at the validation threshold 0.25: precision 0.56, recall 0.50 |
| Predicted 30-day purchase spending | Gradient boosting on log1p(target) | Always-zero (MAE £171) and last-90-days/3 run rate (MAE £166) | MAE £156, RMSE £1,087; MAE £3.7 for zero-spend customers, £2,652 for customers who spent over £1,000; the model under-predicts the mean (£23 vs £171), so values rank customers but must not be summed |

The Model Performance screen shows every candidate (baselines included), the calibration curve,
the threshold trade-off table, error analysis by recency bucket and spend bucket, training and
evaluation dates, model version, data version and limitations. Numbers above are examples from the
run recorded in this repository; re-training reproduces them (fixed random seeds) unless the data
or code changes.

## Screens

* **Overview**: date-range filter; gross sales, net revenue, orders, customers, repeat-purchase rate;
  revenue trend; segment distribution; cohort repeat-purchase heatmap; insights computed from the
  same queries.
* **Customer Explorer**: search by ID; segment, country and activity filters; sortable columns;
  pagination; CSV export of the filtered result; customer detail with purchase history, RFM profile,
  spending trend, predictions with cutoff and model version, and historical behavioural indicators.
* **Model Performance**: baseline vs selected model, metrics with confidence intervals, calibration,
  classification error analysis, regression errors, segment profiles, versions and limitations.
* **Data Quality**: dataset source and coverage, import history, missing values, duplicate
  investigation, return and cancellation counts, exclusion reasons, last processing time.

## API

Base path `/api/v1`, all `GET`, JSON, documented at `/api/docs`.

| Endpoint | Purpose |
|---|---|
| `/health`, `/ready` | Liveness; readiness (database, data present, active models). |
| `/dataset` | Source, attribution, licence, coverage, data cutoff, last processing time. |
| `/overview?start&end` | KPIs, revenue trend, segment distribution, cohorts, insights. |
| `/customers?search&segment&country&activity&sort&order&page&page_size` | Paginated customer list with stored predictions. |
| `/customers/export.csv?...` | Same filters, CSV download (max 50,000 rows). |
| `/customers/filters`, `/customers/{id}` | Filter options; customer detail. |
| `/segments` | Segment profiles from the active segmentation run. |
| `/predictions?type&page&page_size` | Ranked stored predictions (`repeat_purchase_probability` or `predicted_spend_30d`). |
| `/models` | Active model runs with metrics, comparisons, calibration and limitations. |
| `/data-quality` | Import history, validation summary, duplicates, coverage, cleaning rules. |

Every prediction carries the customer ID, scoring cutoff, model version, value and an availability
status; when no model is active the API returns an explicit `unavailable` state with a reason.
Errors always use `{"error": {"code", "message", "details"}}`. Expensive work (import, training,
scoring) is CLI-only and never triggered by a web request.

## Configuration

All settings come from environment variables (see `.env.example`): `DATABASE_URL`,
`TEST_DATABASE_URL`, `MODEL_STORE_DIR`, `MLFLOW_TRACKING_URI`, `MLFLOW_EXPERIMENT_NAME`,
`CORS_ORIGINS`, `LOG_LEVEL`, `VITE_API_BASE_URL`. No secrets are committed.

## Known limitations

* Historical data only (ends 9 December 2011); nothing in the app is live activity.
* Customers appear in several monthly snapshots; observations are not independent. Confidence
  intervals resample whole customers but remain approximate.
* Only identified customers are segmented and scored; about 23% of lines are anonymous.
* The test period is the pre-Christmas peak; metrics may differ in quieter months.
* Feature values shown per customer are descriptive, not causal, and the app makes no claim that
  prioritising outreach increases revenue: that would need an experiment.
* No cloud deployment has been performed; `docs/deployment.md` describes one.

## Next improvements

1. Hold-out experiment design (and the schema to store it) so outreach impact can be measured
   instead of assumed.
2. Two-part spending model (purchase probability × conditional spend) with quantile outputs to
   improve high-spend predictions and give ranges instead of point estimates.
3. Scheduled retraining and drift monitoring on the snapshot features, with model registry
   promotion rules, so the app can move from a historical demo to a live data feed.
