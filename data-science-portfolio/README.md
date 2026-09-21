# Data Science & ML Portfolio Roadmap

Eight lightweight, real-data projects that together cover **every skill in the target role**, each framed as a problem a [Globex Technology](https://www.globextechnology.com/) client actually has: custom software, web and mobile apps, SaaS, e-commerce, cloud/DevOps, digital marketing and AI solutions.

Build them in order. Each one reuses the setup of the one before, and every project ends as something deployable, not a notebook.

**Already built:** P1 and P2 are realised together as the [Globex Customer Intelligence](../globex-customer-intelligence/README.md) application (SQL warehouse, RFM segmentation, 30-day repeat-purchase and spending models, FastAPI + React, Docker, tests, notebooks).

---

## Contents

1. [How to use this roadmap](#1-how-to-use-this-roadmap)
2. [Design principles](#2-design-principles)
3. [Portfolio at a glance](#3-portfolio-at-a-glance)
4. [Skills coverage matrix](#4-skills-coverage-matrix)
5. [Build order and timeline](#5-build-order-and-timeline)
6. [Project specifications](#6-project-specifications)
7. [Standard project template](#7-standard-project-template)
8. [Tooling stack](#8-tooling-stack)
9. [Presenting the portfolio](#9-presenting-the-portfolio)
10. [Start this week](#10-start-this-week)
11. [Appendix: dataset registry](#11-appendix-dataset-registry)

---

## 1. How to use this roadmap

- **One project = one business question, one public dataset, one notebook, one deployable artifact.**
- **Build in order.** P1 sets up data habits, P2 sets up the production template (MLflow, FastAPI, Docker, CI, cloud) that every later project copies.
- **Time budget:** 1 to 2 weeks per project at roughly 10 hours a week. Whole roadmap: about 12 weeks.
- **Short on time?** The minimum viable portfolio is **P1, P2, P4, P6**. Those four alone cover every *required* skill in the role.
- **Every project is written as a client deliverable**, with the Globex service line named, so the portfolio reads as "work I could do for your clients" rather than "tutorials I finished".

## 2. Design principles

1. **Real data, real question.** Every dataset is public, licensed, and produced by a genuine business system (a store, a subscription business, a cloud account, an issue tracker, an app store).
2. **Baseline first.** Always beat a simple baseline and state by how much. A model that cannot beat "same as last week" is not a result.
3. **Ship it.** Notebook, then a tested Python package, then a REST API, then Docker, then cloud. The ladder is the same every time.
4. **Explain it.** Each project ends with a one-page summary a non-technical client could read: problem, what we found, what to do next.
5. **Leakage and evaluation discipline.** Time-based splits where time matters, held-out sets always, metrics chosen from the business decision.

## 3. Portfolio at a glance

| # | Project | Globex service line | Client question | ML type | Effort |
|---|---|---|---|---|---|
| P1 | E-commerce Analytics Warehouse & Customer Segmentation | E-commerce / Shopify, digital transformation | Who are our customers, how do they behave, which segments deserve attention? | ETL, SQL, EDA, clustering | 1.5 wk |
| P2 | SaaS Churn Prediction Service | SaaS, custom software | Which subscribers will cancel next month, and whom do we call first? | Classification | 2 wk |
| P3 | Software Delivery Analytics: Issue Resolution Time | Custom software development, project management | How long will this ticket take, and which ones will miss the SLA? | Regression + classification | 1.5 wk |
| P4 | Retail Demand Forecasting | E-commerce, inventory / ERP | How many units will each store sell per item over the next 90 days? | Time-series forecasting | 1.5 wk |
| P5 | Cloud Infrastructure Anomaly Detection | Cloud, DevOps, AWS | Is this server behaving abnormally right now, and should we alert? | Unsupervised anomaly detection | 1 wk |
| P6 | App Review Intelligence | Mobile apps, App Store Optimization | What are users complaining about, and did the last release make it worse? | NLP classification | 1.5 wk |
| P7 | Product Recommendation Engine | E-commerce | What should we show this customer next? | Recommender systems | 1 wk |
| P8 | Agency Knowledge Assistant (RAG) | AI solutions, GenAI | Can staff and clients get accurate, cited answers from our project documentation? | LLM + retrieval | 1.5 wk |

## 4. Skills coverage matrix

`●` primary focus of the project, `○` used but not the focus.

### Required skills

| Skill | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Python | ● | ● | ● | ● | ● | ● | ● | ● |
| Pandas, NumPy, scikit-learn | ● | ● | ● | ● | ● | ○ | ● | ○ |
| SQL and relational databases | ● | ○ | ● | ○ | | ○ | ● | ○ |
| Data cleaning and preprocessing | ● | ● | ● | ○ | ○ | ● | ○ | ○ |
| Exploratory Data Analysis | ● | ● | ○ | ● | ● | ○ | | |
| Statistical analysis | ● | ○ | ● | ○ | ● | ○ | | |
| Supervised learning | | ● | ● | ● | | ● | | |
| Unsupervised learning | ● | | | | ● | ○ | ○ | |
| Feature engineering and selection | ○ | ● | ● | ● | ○ | ○ | | |
| Model evaluation and optimization | | ● | ● | ● | ● | ● | ● | ● |
| Data visualization (Matplotlib, Seaborn, Plotly) | ● | ○ | ○ | ● | ● | ● | ○ | |
| Jupyter Notebook | ● | ● | ● | ● | ● | ● | ● | ○ |
| REST APIs and model deployment | | ● serve | ● consume | ● | ○ | ○ | ● | ● |
| Git / GitHub (incl. Actions CI) | ● | ● | ● | ● | ● | ● | ● | ● |
| Docker and cloud platforms | ○ | ● | ○ | ● | ○ | ○ | ○ | ● |

### Bonus skills

| Skill | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| AWS / GCP / Azure | | ● | | ● | ○ AWS data | | | ● |
| Power BI or Tableau | ● | | | | | | | |
| Time-series forecasting | | | | ● | ○ | | | |
| NLP | | | ○ | | | ● | | ○ |
| Recommendation systems | | | | | | | ● | |
| PyTorch or TensorFlow | | | | ○ | ○ | ● | | |
| Deploying ML into production | | ● | ○ | ● | | | ○ | ● |
| MLflow / MLOps | | ● | ○ | ● | ○ | ○ | ○ | ● |
| LLMs / Generative AI | | | | | | ○ labelling | | ● |
| Data pipelines / ETL | ● | | ● | | ○ | ○ | | ○ |

Every required skill has at least three projects behind it, and every bonus skill has at least one project where it is the main event.

## 5. Build order and timeline

| Phase | Weeks | Projects | What you walk away with |
|---|---|---|---|
| 1. Foundations | 1 to 3 | P1, P2 | A SQL warehouse, a BI dashboard, and the reusable production template (MLflow + FastAPI + Docker + CI + cloud) |
| 2. Delivery and demand | 4 to 6 | P3, P4 | An API-fed data pipeline, regression with proper time-based evaluation, and a forecasting service |
| 3. Operations and language | 7 to 9 | P5, P6 | Unsupervised detection on real cloud metrics, and a fine-tuned transformer with an honest baseline comparison |
| 4. AI products | 10 to 12 | P7, P8 | A recommender and a RAG assistant with an evaluation harness, both deployed |

Why this order: P1 builds the warehouse that P7 reuses. P2 builds the deployment template every later project copies, so the ops overhead of P3 to P8 is near zero. P4 and P5 share time-series skills. P6 introduces PyTorch and LLM-assisted labelling before P8 relies on LLMs fully.

---

## 6. Project specifications

### P1. E-commerce Analytics Warehouse & Customer Segmentation

**Pitch.** Turn two years of raw online-store transactions into a clean SQL warehouse, a customer-behaviour analysis, and a segmentation the marketing team can act on.

**Globex fit.** Globex builds Shopify and custom e-commerce stores and runs digital-marketing campaigns. This is the analytics layer every such client asks for six months after launch.

**Dataset.** *Online Retail II* (UCI Machine Learning Repository, dataset 502; Kaggle mirrors). About 1.07 million transaction lines from a UK online gift retailer, 1 Dec 2009 to 9 Dec 2011. Columns: Invoice, StockCode, Description, Quantity, InvoiceDate, Price, Customer ID, Country. Licence CC BY 4.0.
Why it is real: cancellations (invoices starting with `C`), negative quantities, roughly a quarter of rows with no customer ID, non-product stock codes (`POST`, `M`, `D`, `BANK CHARGES`), and duplicates. Cleaning it *is* the job.

**Client questions.**
1. Revenue, orders and average order value by month and country. Where is growth?
2. Cohort retention: what share of first-time buyers return in months 1 to 6?
3. Which customer segments exist, and what should marketing do with each?
4. Is average order value different for UK versus non-UK customers?

**Build steps.**
1. **ETL.** Python script loads both yearly sheets, applies documented cleaning rules, writes a star schema to PostgreSQL running in Docker: `fact_sales`, `dim_customer`, `dim_product`, `dim_date`.
2. **Data-quality report.** One table: each cleaning rule, rows affected, why.
3. **SQL analysis.** Ten saved queries using CTEs and window functions: KPIs, cohorts, top products, country mix, repeat-purchase rate.
4. **EDA notebook.** Seasonality, order-size distribution, Pareto check (what share of revenue do the top 20% of products bring), country mix. Seaborn + Plotly.
5. **Statistics.** Mann-Whitney or Welch t-test for the UK vs non-UK question; bootstrap confidence interval on repeat-purchase rate.
6. **Segmentation.** RFM features (recency, frequency, monetary), log-transform and standardise, K-Means with k chosen by elbow and silhouette, profile and name the segments (e.g. Champions, Loyal, At Risk, Hibernating).
7. **Dashboard.** Power BI Desktop or Tableau Public on the warehouse: KPIs, cohort heatmap, segment view.
8. **Write-up.** One page, three recommendations, one per segment that matters.

**Deliverables.** `etl/` package, `sql/` queries, `notebooks/01_eda`, `notebooks/02_segmentation`, dashboard file or public link, README.

**Definition of done.** Warehouse rebuilds from raw with one command. At least three named segments with size, revenue share and one action each. Dashboard published. Hypothesis-test result stated with effect size, not just a p-value.

**Stretch.** dbt for the transformation layer. Nightly ETL on a GitHub Actions cron. Customer lifetime value per segment (BG/NBD model).

---

### P2. SaaS Churn Prediction Service

**Pitch.** Predict which subscribers will churn, explain why, and expose the model as a production REST API with experiment tracking, CI and a cloud deployment. **This project becomes the production template for every project after it.**

**Globex fit.** Globex builds SaaS products. Churn is the number-one metric their SaaS clients care about, and subscription telecom data is structurally identical to SaaS data: contract type, monthly charge, tenure, add-on services, payment method.

**Dataset.** *IBM Telco Customer Churn*. 7,043 customers, 21 columns, about 26.5% churn. Raw CSV in IBM's public GitHub repository `IBM/telco-customer-churn-on-icp4d` (`data/Telco-Customer-Churn.csv`), also on Kaggle.
Why it is real: `TotalCharges` is stored as text with blank values, several columns have the three-valued `Yes / No / No internet service`, and the classes are imbalanced.

**Client questions.**
1. Which customers will churn next month?
2. What drives churn, overall and for one specific customer?
3. If the retention team can only call 10% of customers, whom do they call, and how many churners does that catch?

**Build steps.**
1. **Clean and explore.** Fix types, churn rate by contract / tenure / payment method, chi-square tests for categorical features vs churn.
2. **Features.** Tenure buckets, count of add-on services, charge ratios, one-hot encoding. Build it as a scikit-learn `ColumnTransformer` + `Pipeline` so preprocessing ships inside the model.
3. **Models.** Logistic regression (baseline), random forest, gradient boosting (LightGBM or XGBoost). Stratified k-fold, class weights, hyperparameter search.
4. **Evaluation.** ROC-AUC, PR-AUC, calibration curve, lift and gain chart, confusion matrix at the business threshold. Choose the threshold by expected value: cost of a retention offer vs value of a saved customer.
5. **Explainability.** SHAP global importance and per-customer explanations returned by the API.
6. **Tracking.** Log every run (params, metrics, artifacts) to MLflow; register the winning model.
7. **Serve.** FastAPI with `/predict` (single and batch), Pydantic validation, `/health`; pytest for the API and the pipeline.
8. **Ship.** Dockerfile; GitHub Actions running ruff, pytest and a Docker build on every push; deploy the container to Google Cloud Run (free tier) or AWS.

**Deliverables.** `src/churn` package, notebooks, MLflow experiment, API, Dockerfile, CI workflow, live URL plus a `curl` example in the README.

**Definition of done.** Best model beats the logistic-regression baseline on PR-AUC (or you explain why it cannot). Lift at the top 10% is reported in plain language ("calling the top 10% catches X% of churners"). CI is green. Endpoint is live or the deploy is fully documented.

**Stretch.** Nightly batch scoring into Postgres. Streamlit "retention desk" screen. Data-drift report with Evidently.

---

### P3. Software Delivery Analytics: Issue Resolution Time

**Pitch.** Build a pipeline that pulls issue-tracker data from a REST API into a database, then predict how long each new issue will take to close and flag likely SLA breaches so project managers can plan sprints and set client expectations.

**Globex fit.** Globex's core business is custom software delivery run by project managers. Predictable delivery is the promise they sell; this makes it measurable.

**Dataset.** *GitHub Issues REST API* for three to five active open-source repositories of your choice. Endpoint `GET /repos/{owner}/{repo}/issues?state=all&per_page=100`. Note that the endpoint also returns pull requests (drop rows that carry a `pull_request` key). Rate limit: 60 requests/hour unauthenticated, 5,000/hour with a personal token. Target about 20,000 closed issues.
Bulk alternative: *The Public Jira Dataset* (Zenodo, CC BY 4.0; 2.7 million issues across 16 public Jira instances as a MongoDB dump). Heavier, but it is the real thing.

**Client questions.**
1. How long will this issue take to resolve?
2. Will it breach a 14-day SLA?
3. Which factors matter: labels, text, author type, day of week, early activity?

**Build steps.**
1. **Ingestion pipeline.** Incremental fetch using `since`, pagination, retries with backoff, raw JSON kept, then normalised tables (`issues`, `labels`, `events`) in PostgreSQL or SQLite. Schedule on a GitHub Actions cron.
2. **SQL.** Throughput per week, median resolution time by label / repo / month, backlog age distribution.
3. **EDA and statistics.** Resolution time is heavy-tailed, so model `log(hours)`. Kaplan-Meier survival curves by label, which handle still-open issues correctly.
4. **Features.** Title and body text (TF-IDF, length, has code block), label flags, author association, weekday and hour, comments in the first 24 hours. Keep a written **leakage checklist**: only use what is known at scoring time.
5. **Models.** Regression on log-hours (Ridge, then LightGBM) scored with MAE and RMSLE; SLA-breach classifier scored with ROC-AUC and recall at a fixed precision.
6. **Evaluation.** Time-based split: train on older issues, test on newer. Compare against a "median time for this label" baseline.
7. **Serve.** `/predict` takes title, body and labels and returns an ETA plus breach probability. Docker.
8. **Write-up** for a project-manager audience.

**Deliverables.** `pipeline/` package, `sql/`, notebooks, model, API, leakage checklist, README.

**Definition of done.** Pipeline re-runs incrementally with no duplicates. Time-based MAE beats the median-by-label baseline. Survival curves included. Leakage checklist published.

**Stretch.** Run the same code on the Jira dataset. Add flow metrics (WIP, cycle time). Streamlit PM view.

---

### P4. Retail Demand Forecasting

**Pitch.** Forecast daily demand for 500 store-item series 90 days ahead with rigorous backtesting, then serve forecasts through an API an inventory system could call.

**Globex fit.** E-commerce, inventory and ERP clients. Forecasting is the most common "can you add AI to this" request for operational software.

**Dataset.** *Store Item Demand Forecasting Challenge* (Kaggle competition `demand-forecasting-kernels-only`). 913,000 rows; columns `date, store, item, sales`; 10 stores x 50 items, daily, 2013 to 2017.
Richer alternative: *Rossmann Store Sales* (Kaggle) with promotions, holidays and competitor distance.

**Client questions.**
1. Expected sales per store-item per day for the next 90 days, with uncertainty.
2. How much better is the model than "same as last year"?
3. Which items are hardest to forecast and why?

**Build steps.**
1. **EDA.** Trend, weekly and yearly seasonality, store and item effects, STL decomposition, ADF stationarity test.
2. **Baselines.** Seasonal naive (same weekday last week, same day last year) and moving average. Metrics: SMAPE and MAE per series, then aggregated.
3. **Statistical model.** SARIMA or Prophet on a handful of series to understand the components.
4. **Global ML model.** One LightGBM model across all series: lag features (7, 14, 28, 364), rolling means, calendar features, store and item identifiers.
5. **Backtesting.** Rolling-origin cross-validation with three 90-day folds. Never a random split.
6. **Consistency check.** Item forecasts should roughly sum to store totals.
7. **Tracking.** Log every configuration to MLflow; retrain the winner on full history.
8. **Serve.** `GET /forecast?store=&item=&horizon=` returns JSON; forecasts precomputed and cached; Docker; deploy to Cloud Run.
9. **Visualise.** Plotly chart of actuals vs forecast with prediction intervals.

**Deliverables.** Notebooks, `src/forecast` package, MLflow experiment, API, Docker, deployment.

**Definition of done.** Global model beats seasonal-naive SMAPE by at least 20% on backtest. Prediction intervals reported. API deployed.

**Stretch.** Add holiday and promo features (Rossmann). Quantile forecasts for safety stock. A neural model (N-BEATS via the `darts` library, PyTorch) as a third contender.

---

### P5. Cloud Infrastructure Anomaly Detection

**Pitch.** Detect anomalies in real AWS CloudWatch metrics (CPU, network, disk, load balancer, RDS) without labels, score against ground truth, and package the detector as a lightweight alerting service.

**Globex fit.** Globex sells DevOps and AWS services. Every client system they deploy needs monitoring, and smarter anomaly detection means fewer false alerts and faster incident response.

**Dataset.** *Numenta Anomaly Benchmark (NAB)*, folder `data/realAWSCloudwatch`. 17 CSV files (`ec2_cpu_utilization_*`, `ec2_network_in_*`, `ec2_disk_write_bytes_*`, `elb_request_count_*`, `rds_cpu_utilization_*`, and others), each with `timestamp, value` at 5-minute intervals, about 4,000 points per file. Labelled anomaly windows in `labels/combined_windows.json`. MIT licence.

**Client questions.**
1. Is this metric abnormal right now?
2. How many false alarms per day does each method produce?
3. How quickly does each method detect a real incident?

**Build steps.**
1. **Load and explore.** Plot every series with its labelled windows; describe regime changes and daily patterns.
2. **Statistical baselines.** Rolling z-score, EWMA control chart, residuals from seasonal decomposition.
3. **Unsupervised ML.** Isolation Forest and One-Class SVM on windowed features (lags, rolling statistics, time of day).
4. **Deep option.** A small LSTM or 1-D CNN autoencoder in PyTorch; anomaly score = reconstruction error.
5. **Evaluation.** Precision, recall and F1 against NAB windows, plus time-to-detect and false alarms per day. One comparison table across all 17 series. Tune thresholds for a target false-alarm rate.
6. **Streaming simulation.** Replay a CSV through the detector point by point with a fixed latency budget.
7. **Package.** `/score` endpoint plus a simple alert rule; Docker.
8. **Visualise.** Plotly dashboard of anomaly scores over labelled windows.

**Deliverables.** Notebooks, `src/anomaly` package, comparison table, streaming demo, API, Docker.

**Definition of done.** At least three methods compared on all 17 series in one table. The chosen method's false-alarm rate is stated. The detector runs on a stream.

**Stretch.** Collect live metrics from a free-tier EC2 instance and run the detector on them. Send alerts to a Slack webhook.

---

### P6. App Review Intelligence

**Pitch.** Collect real Google Play reviews for a set of apps, classify sentiment and issue type (bug, crash, performance, UX, pricing, feature request), and build a dashboard product teams can check after every release.

**Globex fit.** Globex builds and markets mobile apps, and lists App Store Optimization as a service. Review mining tells their app clients what to fix and what to promote.

**Dataset.** Live collection with the `google-play-scraper` Python package (PyPI, MIT): reviews for 5 to 10 apps in one category (banking, food delivery, ride-hailing), 10,000 to 30,000 reviews with score, text, date, app version and thumbs-up count.
Fallback: Kaggle *Google Play Store Apps* user-reviews file (about 64,000 reviews with sentiment labels).

**Client questions.**
1. What share of reviews are negative, and how does that trend by app version?
2. What are people complaining about, by category?
3. Did the last release make things better or worse?

**Build steps.**
1. **Collect.** Polite, rate-limited scraper; store in SQLite or Postgres.
2. **Clean.** Language filter, deduplication, emoji handling, tokenisation.
3. **EDA.** Rating distribution over time and by version; term frequency by star rating.
4. **Labels.** Sentiment from stars (1 to 2 negative, 4 to 5 positive; drop 3). Issue type has no labels, so build a 1,000-review labelled set: hand-label 300, use an LLM to label the rest, verify a random sample, and publish the labelling guide and agreement rate.
5. **Baseline.** TF-IDF + logistic regression or linear SVM; multi-label for issue type; macro-F1.
6. **Transformer.** Fine-tune DistilBERT (PyTorch, Hugging Face) on issue type; bootstrap confidence intervals on F1; compare honestly with the baseline.
7. **Topics.** BERTopic or NMF to surface emerging themes per version (unsupervised).
8. **Dashboard.** Streamlit or Plotly Dash: sentiment trend, issue mix by version, top negative themes.
9. **API.** `/classify` endpoint; Docker.

**Deliverables.** Collector, labelled dataset and labelling guide, notebooks, baseline vs transformer report, dashboard, API.

**Definition of done.** Baseline and transformer reported with confidence intervals. One concrete "what changed after version X" insight. Labelling guide published.

**Stretch.** Aspect-based sentiment. Alert when the negative share jumps after a release. Export the model to ONNX for cheap CPU inference.

---

### P7. Product Recommendation Engine

**Pitch.** Recommend products to returning customers of an online store from implicit purchase data, evaluate properly against baselines, and serve top-N recommendations via an API.

**Globex fit.** E-commerce and Shopify clients. "Customers also bought" is the most requested personalisation feature.

**Dataset.** Reuse the P1 warehouse (*Online Retail II*). Customer x product purchase counts form the implicit-feedback matrix: roughly 4,000+ customers by 4,000+ products after cleaning.

**Client questions.**
1. Which 10 products should we show this customer?
2. Which products are similar to this one?
3. How much better is this than just showing best-sellers?

**Build steps.**
1. **Interactions.** Build the sparse customer-product matrix from the warehouse with SQL.
2. **Baselines.** Popularity, and item-item co-purchase (cosine similarity on the sparse matrix).
3. **Matrix factorisation.** Implicit ALS (`implicit` library) or SVD (`surprise`); tune factors and regularisation.
4. **Evaluation.** Time-based split (last three months held out). Precision@10, recall@10, MAP@10, catalogue coverage, novelty. Compare all methods in one table.
5. **Cold start.** Fall back to popularity by country for new customers.
6. **Serve.** `/recommend/{customer_id}?n=10` and `/similar/{stock_code}`; recommendations precomputed nightly; Docker.
7. **Narrative.** Notebook that shows sample recommendations as product descriptions, so a client can judge them by eye.

**Deliverables.** `src/recsys` package, evaluation table, API, Docker.

**Definition of done.** MAP@10 beats the popularity baseline. Coverage reported. API runs in Docker.

**Stretch.** Session-based recommendations. Hybrid model using product-description embeddings. A one-page A/B test design for a client rollout.

---

### P8. Agency Knowledge Assistant (RAG)

**Pitch.** A retrieval-augmented assistant that answers questions from a software agency's documentation with cited sources, plus an evaluation harness that measures retrieval and answer quality, and a deployed API with cost guardrails.

**Globex fit.** "AI solutions" is a headline Globex service, and an internal or customer-facing knowledge assistant is the most common GenAI request from small and mid-size business clients.

**Corpus.** Your own portfolio READMEs and runbooks from P1 to P7, plus an openly licensed engineering handbook (for example the GitLab Handbook, CC BY-SA) standing in for "the agency's processes". About 500 to 2,000 pages.

**Client questions.**
1. Can staff get accurate answers with sources instead of searching wikis?
2. How often does the assistant retrieve the right document?
3. How often does it make things up?

**Build steps.**
1. **Ingest.** Chunk by heading, about 500 tokens with overlap; keep metadata (source, section, URL).
2. **Embed and store.** Open-weight embedding model via `sentence-transformers`; vector store in `pgvector` inside Postgres (reuses SQL skills) or Chroma.
3. **Retrieve.** Hybrid dense + BM25, top-k, optional cross-encoder reranker.
4. **Generate.** Any hosted LLM API or a local open-weight model via Ollama. Prompt requires citations and a refusal when no relevant chunk exists.
5. **Evaluate.** A 40-question golden set with expected sources. Metrics: hit-rate@5 and MRR for retrieval; faithfulness and relevance via an LLM judge for answers. Compare at least three configurations (chunk size, k, hybrid vs dense) and log them to MLflow.
6. **Serve.** FastAPI `/ask` returns answer + citations; Docker; deploy to cloud with token caps and response caching.
7. **Demo.** Minimal Streamlit chat UI and a two-minute screen recording.

**Deliverables.** Ingestion pipeline, evaluation harness and golden set, comparison table, API, Docker, deployment, demo.

**Definition of done.** Evaluation table for at least three configurations. Hit-rate@5 of 0.8 or better on the golden set. Every answer carries citations. Deployed.

**Stretch.** Text-to-SQL over the P1 warehouse. Thumbs-up/down feedback stored in Postgres and used to grow the golden set. Guardrails for prompt injection.

---

## 7. Standard project template

Use the same skeleton for all eight projects so the portfolio reads as one system.

```
data-science-portfolio/
  README.md                      this roadmap
  projects/
    p1-ecommerce-warehouse/
    p2-saas-churn/
      README.md                  Problem, Data, Approach, Results, How to run, Next steps, Business summary
      data/
        README.md                source link, licence, download command
        raw/                     git-ignored
        processed/               small derived files only
      notebooks/
        01_eda.ipynb             runs top to bottom, no hidden state
        02_modeling.ipynb
      src/churn/
        data.py  features.py  train.py  predict.py  api.py
      tests/                     pytest
      sql/                       where applicable
      Dockerfile
      pyproject.toml             uv or poetry
      Makefile                   make data | train | test | serve | docker
      .github/workflows/ci.yml   ruff + pytest + docker build
```

**Definition of done for every project (copy into each README as a checklist).**

- [ ] Data source and licence documented, raw data reproducible with one command
- [ ] Notebook runs top to bottom from a clean kernel
- [ ] Baseline reported next to the final model
- [ ] Held-out evaluation with the right split (time-based where time matters)
- [ ] Core logic lives in `src/`, covered by tests, not only in notebooks
- [ ] MLflow run for the final model (from P2 onward)
- [ ] REST API with a health check and an example request
- [ ] Docker image builds and runs locally
- [ ] CI green on GitHub Actions
- [ ] README has one results table, one chart, and a plain-language business summary

## 8. Tooling stack

| Layer | Choice | Notes |
|---|---|---|
| Environment | Python 3.11+, `uv` (or Poetry), pre-commit with `ruff` | One `pyproject.toml` per project |
| Data | pandas, NumPy, SQLAlchemy, PostgreSQL in Docker, DuckDB for quick analytics | SQLite is fine for P3 and P6 |
| Classical ML | scikit-learn, LightGBM, statsmodels, Prophet | Pipelines so preprocessing ships with the model |
| Deep learning | PyTorch, Hugging Face `transformers`, `sentence-transformers` | Train on Colab or Kaggle GPUs when needed |
| Visualisation | Matplotlib, Seaborn, Plotly | Plus Power BI / Tableau Public (P1) and Streamlit (P6, P8) |
| Experiment tracking | MLflow (local tracking server, then Docker) | Model registry from P2 onward |
| Serving | FastAPI + Uvicorn, Pydantic | `/health`, `/predict`, batch endpoints |
| Containers and CI | Docker, GitHub Actions | Lint, test, build on every push |
| Cloud | Google Cloud Run (free tier) or AWS (Lambda / App Runner); Hugging Face Spaces for demos | Deploy at least P2, P4 and P8 |
| LLM and retrieval | Any hosted LLM API or Ollama for local open-weight models; `pgvector` or Chroma | Keep provider-agnostic behind one interface |

Deployment ladder, every time: **local run -> Docker image -> cloud service -> URL in the README.**

## 9. Presenting the portfolio

- **Top-level README** (this file) with the at-a-glance table and links to each project.
- **Each project README** opens with the client question, one metric table, one chart, and the live link.
- **CV and LinkedIn:** one line per project in the form *problem -> result -> stack*. Example: "Cut retail forecast error 25% vs seasonal baseline with a global LightGBM model; served via FastAPI on Cloud Run."
- **Flagships:** record a five-minute demo of P2, P4 and P8. Those three show the full path from raw data to a running service.
- **Business summary** at the end of every README: three sentences a client could read.

## 10. Start this week

1. Create `projects/p1-ecommerce-warehouse/` from the template in section 7.
2. Download Online Retail II and write `data/README.md` with the source and licence.
3. Start PostgreSQL in Docker (`docker run -e POSTGRES_PASSWORD=... -p 5432:5432 postgres:16`).
4. Write the ETL: load, clean with documented rules, write the star schema.
5. Write the first five SQL queries and the data-quality report. That is P1 half done.

## 11. Appendix: dataset registry

| Project | Dataset | Source | Size | Licence / terms |
|---|---|---|---|---|
| P1, P7 | Online Retail II | UCI ML Repository (id 502), Kaggle mirrors | ~1.07M rows, 8 columns | CC BY 4.0 |
| P2 | IBM Telco Customer Churn | `github.com/IBM/telco-customer-churn-on-icp4d` (`data/Telco-Customer-Churn.csv`), Kaggle | 7,043 rows, 21 columns | IBM sample data, public |
| P3 | GitHub Issues | GitHub REST API `GET /repos/{owner}/{repo}/issues` | ~20k issues (your choice of repos) | GitHub API terms; 5,000 req/h with token |
| P3 (alt) | The Public Jira Dataset | Zenodo (Montgomery, Lueders, Maalej, MSR 2022) | 2.7M issues, MongoDB dump | CC BY 4.0 |
| P4 | Store Item Demand Forecasting | Kaggle competition `demand-forecasting-kernels-only` | 913,000 rows, 4 columns | Kaggle competition rules |
| P4 (alt) | Rossmann Store Sales | Kaggle competition `rossmann-store-sales` | ~1M rows | Kaggle competition rules |
| P5 | NAB `realAWSCloudwatch` | `github.com/numenta/NAB/data/realAWSCloudwatch` | 17 files, ~4,000 points each | MIT |
| P6 | Google Play reviews | `google-play-scraper` (PyPI) live collection; Kaggle Google Play Store Apps as fallback | 10k to 30k reviews | Respect Google Play terms; research use |
| P8 | Portfolio docs + GitLab Handbook | This repository; `handbook.gitlab.com` | 500 to 2,000 pages | Own content; CC BY-SA |
