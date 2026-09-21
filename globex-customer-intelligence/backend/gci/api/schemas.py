"""Pydantic response schemas. These define the API contract consumed by the frontend.

Conventions
-----------
* Money is returned as a plain number in GBP (the frontend formats it).
* Dates are ISO-8601 strings (``YYYY-MM-DD``); timestamps include the time part.
* Every list endpoint returns ``Paginated[...]``.
* Errors always use ``ErrorResponse``.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


# --------------------------------------------------------------------------- common
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: list[dict] | dict | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int


class DatasetInfo(BaseModel):
    """Shown on every screen so nobody mistakes 2009-2011 history for live activity."""

    name: str
    source_url: str
    attribution: str
    license: str
    mode: Literal["historical_demo"] = "historical_demo"
    first_transaction_at: datetime | None
    last_transaction_at: datetime | None
    data_cutoff: date | None
    last_processed_at: datetime | None


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str


class ReadinessResponse(BaseModel):
    status: Literal["ready", "not_ready"]
    database: Literal["ok", "unavailable"]
    has_transactions: bool
    has_customers: bool
    has_active_models: dict[str, bool]
    detail: str | None = None


# --------------------------------------------------------------------------- overview
class OverviewKpis(BaseModel):
    gross_sales: float
    net_revenue: float
    return_amount: float
    orders: int
    purchasing_customers: int
    anonymous_orders: int
    average_order_value: float | None
    repeat_purchase_rate: float | None
    return_rate: float | None = Field(description="Return amount as a share of gross sales")


class TrendPoint(BaseModel):
    month: date
    gross_sales: float
    net_revenue: float
    orders: int
    purchasing_customers: int


class SegmentShare(BaseModel):
    segment_name: str
    cluster_id: int
    customers: int
    share: float
    revenue_share: float | None = None


class CohortCell(BaseModel):
    cohort_month: date
    months_since_first: int
    cohort_size: int
    active_customers: int
    repeat_rate: float


class Insight(BaseModel):
    title: str
    detail: str
    kind: Literal["observation", "caution"] = "observation"


class OverviewResponse(BaseModel):
    dataset: DatasetInfo
    period_start: date
    period_end: date
    kpis: OverviewKpis
    revenue_trend: list[TrendPoint]
    segment_distribution: list[SegmentShare]
    segmentation_model_version: str | None
    cohorts: list[CohortCell]
    insights: list[Insight]


# --------------------------------------------------------------------------- customers
class PredictionValue(BaseModel):
    status: Literal["available", "unavailable"]
    value: float | None = None
    cutoff_date: date | None = None
    model_version: str | None = None
    rank: int | None = None
    reason: str | None = None


class CustomerListItem(BaseModel):
    customer_id: str
    segment_name: str | None
    country: str | None
    last_purchase_at: datetime | None
    historical_spend: float = Field(description="Lifetime gross sales, GBP")
    order_count: int
    repeat_purchase_probability: PredictionValue
    predicted_spend_30d: PredictionValue


class OrderSummary(BaseModel):
    invoice: str
    order_at: datetime
    is_cancellation: bool
    line_count: int
    units: int
    gross_amount: float
    return_amount: float
    net_amount: float


class RfmProfile(BaseModel):
    cutoff_date: date
    lookback_days: int
    recency_days: int
    frequency: int
    monetary: float
    segment_name: str | None
    cluster_id: int | None
    model_version: str | None


class MonthlySpend(BaseModel):
    month: date
    gross_sales: float
    net_revenue: float
    orders: int


class BehaviouralIndicator(BaseModel):
    name: str
    label: str
    value: float | None
    unit: Literal["days", "count", "gbp", "ratio"]


class CustomerDetail(BaseModel):
    customer_id: str
    country: str | None
    first_purchase_at: datetime | None
    last_purchase_at: datetime | None
    order_count: int
    return_order_count: int
    gross_sales: float
    return_amount: float
    net_revenue: float
    distinct_products: int
    segment_name: str | None
    rfm: RfmProfile | None
    repeat_purchase_probability: PredictionValue
    predicted_spend_30d: PredictionValue
    behavioural_indicators: list[BehaviouralIndicator] = Field(
        description="Historical feature values at the scoring cutoff. Descriptive, not causal."
    )
    spend_trend: list[MonthlySpend]
    purchase_history: list[OrderSummary]


class CountryOption(BaseModel):
    country: str
    customers: int


class CustomerFilterOptions(BaseModel):
    segments: list[str]
    countries: list[CountryOption]
    activity: list[str]


# --------------------------------------------------------------------------- segments
class SegmentProfile(BaseModel):
    cluster_id: int
    segment_name: str
    customers: int
    share: float
    avg_recency_days: float
    median_recency_days: float
    avg_frequency: float
    median_frequency: float
    avg_monetary: float
    median_monetary: float
    total_monetary: float
    revenue_share: float
    description: str


class SegmentsResponse(BaseModel):
    model_version: str | None
    cutoff_date: date | None
    lookback_days: int
    segments: list[SegmentProfile]
    status: Literal["available", "unavailable"]
    reason: str | None = None


# --------------------------------------------------------------------------- predictions
class PredictionItem(BaseModel):
    customer_id: str
    prediction_type: str
    cutoff_date: date
    model_version: str
    probability: float | None
    predicted_spend: float | None
    rank: int | None
    segment_name: str | None


class PredictionsMeta(BaseModel):
    status: Literal["available", "unavailable"]
    prediction_type: str
    model_version: str | None
    cutoff_date: date | None
    scored_customers: int
    reason: str | None = None


class PredictionsResponse(BaseModel):
    meta: PredictionsMeta
    results: Paginated[PredictionItem]


# --------------------------------------------------------------------------- models
class MetricEntry(BaseModel):
    name: str
    label: str
    value: float | None
    ci_low: float | None = None
    ci_high: float | None = None
    higher_is_better: bool | None = None


class ModelComparisonRow(BaseModel):
    model_name: str
    algorithm: str
    is_baseline: bool
    is_selected: bool
    validation_metrics: dict[str, float | None]
    test_metrics: dict[str, float | None] | None = None


class CalibrationBin(BaseModel):
    bin_lower: float
    bin_upper: float
    mean_predicted: float
    observed_rate: float
    count: int


class ThresholdRow(BaseModel):
    threshold: float
    precision: float
    recall: float
    flagged_share: float
    flagged_count: int


class ErrorBucket(BaseModel):
    bucket: str
    count: int
    mae: float | None = None
    rmse: float | None = None
    precision: float | None = None
    recall: float | None = None
    mean_actual: float | None = None
    mean_predicted: float | None = None


class ModelRunSummary(BaseModel):
    model_type: str
    model_version: str
    algorithm: str
    status: str
    is_active: bool
    trained_at: datetime
    data_cutoff: date | None
    scoring_cutoff: date | None
    train_period: tuple[date, date] | None
    validation_period: tuple[date, date] | None
    test_period: tuple[date, date] | None
    n_train: int | None
    n_validation: int | None
    n_test: int | None
    params: dict
    metrics: dict
    headline_metrics: list[MetricEntry]
    comparison: list[ModelComparisonRow]
    feature_names: list[str]
    data_version: str | None
    code_version: str | None
    mlflow_run_id: str | None
    limitations: list[str]
    calibration: list[CalibrationBin] | None = None
    thresholds: list[ThresholdRow] | None = None
    error_analysis: list[ErrorBucket] | None = None


class ModelsResponse(BaseModel):
    classification: ModelRunSummary | None
    regression: ModelRunSummary | None
    segmentation: ModelRunSummary | None
    segment_profiles: list[SegmentProfile]


# --------------------------------------------------------------------------- data quality
class ImportRunSummary(BaseModel):
    id: int
    source_path: str
    source_kind: str
    file_sha256: str
    file_size_bytes: int
    started_at: datetime
    finished_at: datetime | None
    status: str
    rows_read: int
    rows_accepted: int
    rows_excluded: int
    rows_flagged: int
    sheets: list[dict] | None
    error_message: str | None


class ReasonCount(BaseModel):
    reason: str
    label: str
    rows: int
    share: float


class MissingValueCount(BaseModel):
    field: str
    missing_rows: int
    share: float


class DuplicateInvestigation(BaseModel):
    exact_duplicate_rows: int
    share_of_rows: float
    duplicate_gross_amount: float
    share_of_gross_sales: float
    invoices_affected: int
    duplicate_rows_with_customer_share: float
    decision: str


class DataQualityResponse(BaseModel):
    dataset: DatasetInfo
    imports: list[ImportRunSummary]
    rows_read: int
    rows_accepted: int
    rows_excluded: int
    rows_flagged: int
    exclusion_reasons: list[ReasonCount]
    flags: list[ReasonCount]
    missing_values: list[MissingValueCount]
    duplicates: DuplicateInvestigation | None
    cancellation_invoices: int
    cancellation_lines: int
    return_amount: float
    anonymous_lines: int
    anonymous_gross_sales: float
    countries: int
    products: int
    identified_customers: int
    eligible_positive_orders: int
    cleaning_rules: list[dict[str, str]]
