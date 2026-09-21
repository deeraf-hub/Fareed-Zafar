# Architecture

```
 UCI workbook (.xlsx, 2 sheets)  or  local .csv
            │  gci download / gci import-data
            ▼
 ┌─────────────────────┐   validation + flags   ┌───────────────────┐
 │ raw_transactions    │ ─────────────────────▶ │ transactions      │  cleaned, typed, flagged
 │ (all fields as text)│   quarantine reasons   │ (accepted rows)   │
 └─────────────────────┘                        └─────────┬─────────┘
            import_runs (checksum, counts, validation summary)      │ gci build-analytics (SQL)
                                                                    ▼
                         products   customers   orders   order_items
                                                                    │ gci build-features
                                                                    ▼
                                             customer_snapshots (features < cutoff, labels ≥ cutoff)
                                                                    │ gci train / gci predict
                                                                    ▼
                                  model_runs   customer_segments   predictions   (+ MLflow, joblib)
                                                                    │
                                                    FastAPI (read-only)  ◀──  React UI
```

## Components

| Component | Location | Notes |
|---|---|---|
| Ingestion | `backend/gci/ingest/` | `readers.py` (xlsx sheets / csv, header normalisation), `rules.py` (validation + flags, single source of truth), `importer.py` (COPY-based staged load, checksum idempotency), `analytics.py` (set-based SQL rebuild), `quality.py` (report), `download.py` (UCI fetch with attribution). |
| Features | `backend/gci/features/snapshots.py` | Monthly cutoffs, point-in-time features, half-open 30-day label window, chronological splits with purge. |
| Models | `backend/gci/ml/` | `segmentation.py` (K-means on log-scaled RFM, k comparison, naming from cluster medians), `classification.py` (dummy vs logistic vs gradient boosting), `regression.py` (zero and run-rate baselines vs gradient boosting variants), `metrics.py` (precision@k per cutoff, calibration, grouped bootstrap), `scoring.py`, `tracking.py` (MLflow + model registry table). |
| API | `backend/gci/api/` | Routers, services, Pydantic schemas (`schemas.py` is the contract), readable SQL in `sql/`. Errors always `{"error": {...}}`. |
| Database | `backend/gci/db/models.py`, `backend/alembic/` | PostgreSQL schema with constraints and indexes; Alembic migration `0001`. |
| CLI | `backend/gci/cli.py` | Every expensive job. The API never trains or imports. |
| Frontend | `frontend/` | Vite + React + TypeScript + Tailwind + Plotly; consumes only the API. |
| Notebooks | `backend/notebooks/` | Data quality, EDA, segmentation, model evaluation; they import the `gci` modules. |

## Data dictionary (grain)

| Table | Grain | Key columns |
|---|---|---|
| `import_runs` | one import attempt | `file_sha256`, `status`, row counts, `validation_summary` |
| `raw_transactions` | one source line | `*_raw` text fields, `row_hash`, `validation_status`, `exclusion_reasons`, `flags` |
| `transactions` | one accepted line | typed fields, `line_amount`, eligibility flags |
| `products` | one stock code | `is_non_product`, sales aggregates |
| `customers` | one identified customer | lifetime aggregates from `orders` |
| `orders` | one invoice | `gross_amount`, `return_amount`, `net_amount`, `is_eligible_positive` |
| `order_items` | one accepted, non-duplicate line | FK to `orders`, `products`, `transactions` |
| `customer_snapshots` | one customer at one cutoff | 21 features, `label_purchased`, `label_spend`, `dataset_split` |
| `customer_segments` | one customer per segmentation run | `cluster_id`, `segment_name`, RFM values |
| `model_runs` | one trained model version | metrics, comparison, params, artifact path, MLflow run id |
| `predictions` | one customer per model run | `probability` or `predicted_spend`, `rank`, `cutoff_date` |

Only one run per model type is active at a time (`model_runs.is_active`); the API always reads the
active run, so re-training atomically switches what the UI shows.

## Leakage controls

1. Features use orders strictly before the cutoff; labels use `[cutoff, cutoff + 30 days)`.
2. Snapshots without a complete outcome window are unlabelled (scoring only).
3. Train / validation / test are contiguous, chronological cutoff ranges; boundary snapshots whose
   outcome window crosses into the next period are marked `purged`.
4. Imputers and scalers live inside scikit-learn pipelines, so they are fitted on training rows only
   (`tests/test_models.py::test_preprocessing_is_fitted_on_training_data_only`).
5. Hyper-parameters and the classification threshold are chosen on validation; the test period is
   scored once after selection.
6. Repeated customer observations are declared as a limitation; confidence intervals use a
   customer-grouped bootstrap.

## Runtime and storage separation

* `db` (PostgreSQL) with a named volume.
* `api` container (FastAPI) and the same image for CLI jobs (`docker compose run --rm api gci ...`).
* `web` container (nginx serving the built React app, proxying `/api`).
* `model-store` and `mlflow-store` volumes hold fitted pipelines and experiment tracking, outside the
  containers and the database.
