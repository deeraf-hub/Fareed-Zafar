// Types mirror the backend API contract (base path /api/v1) exactly.
// Money values are plain numbers in GBP. Dates are YYYY-MM-DD; timestamps are ISO datetimes.

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

export type HealthResponse = { status: 'ok'; version: string };

export type ReadyResponse = {
  status: 'ready' | 'not_ready';
  database: 'ok' | 'unavailable';
  has_transactions: boolean;
  has_customers: boolean;
  has_active_models: { [k: string]: boolean };
  detail?: string | null;
};

export type DatasetInfo = {
  name: string;
  source_url: string;
  attribution: string;
  license: string;
  mode: 'historical_demo';
  first_transaction_at: string | null;
  last_transaction_at: string | null;
  data_cutoff: string | null;
  last_processed_at: string | null;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type PredictionValue = {
  status: 'available' | 'unavailable';
  value: number | null;
  cutoff_date: string | null;
  model_version: string | null;
  rank: number | null;
  reason: string | null;
};

export type OverviewKpis = {
  gross_sales: number;
  net_revenue: number;
  return_amount: number;
  orders: number;
  purchasing_customers: number;
  anonymous_orders: number;
  average_order_value: number | null;
  repeat_purchase_rate: number | null;
  return_rate: number | null;
};

export type TrendPoint = {
  month: string;
  gross_sales: number;
  net_revenue: number;
  orders: number;
  purchasing_customers: number;
};

export type SegmentShare = {
  segment_name: string;
  cluster_id: number;
  customers: number;
  share: number;
  revenue_share: number | null;
};

export type CohortCell = {
  cohort_month: string;
  months_since_first: number;
  cohort_size: number;
  active_customers: number;
  repeat_rate: number;
};

export type Insight = {
  title: string;
  detail: string;
  kind: 'observation' | 'caution';
};

export type OverviewResponse = {
  dataset: DatasetInfo;
  period_start: string;
  period_end: string;
  kpis: OverviewKpis;
  revenue_trend: TrendPoint[];
  segment_distribution: SegmentShare[];
  segmentation_model_version: string | null;
  cohorts: CohortCell[];
  insights: Insight[];
};

export type CustomerListItem = {
  customer_id: string;
  segment_name: string | null;
  country: string | null;
  last_purchase_at: string | null;
  historical_spend: number;
  order_count: number;
  repeat_purchase_probability: PredictionValue;
  predicted_spend_30d: PredictionValue;
};

export type OrderSummary = {
  invoice: string;
  order_at: string;
  is_cancellation: boolean;
  line_count: number;
  units: number;
  gross_amount: number;
  return_amount: number;
  net_amount: number;
};

export type RfmProfile = {
  cutoff_date: string;
  lookback_days: number;
  recency_days: number;
  frequency: number;
  monetary: number;
  segment_name: string | null;
  cluster_id: number | null;
  model_version: string | null;
};

export type MonthlySpend = {
  month: string;
  gross_sales: number;
  net_revenue: number;
  orders: number;
};

export type IndicatorUnit = 'days' | 'count' | 'gbp' | 'ratio';

export type BehaviouralIndicator = {
  name: string;
  label: string;
  value: number | null;
  unit: IndicatorUnit;
};

export type CustomerDetail = {
  customer_id: string;
  country: string | null;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  order_count: number;
  return_order_count: number;
  gross_sales: number;
  return_amount: number;
  net_revenue: number;
  distinct_products: number;
  segment_name: string | null;
  rfm: RfmProfile | null;
  repeat_purchase_probability: PredictionValue;
  predicted_spend_30d: PredictionValue;
  behavioural_indicators: BehaviouralIndicator[];
  spend_trend: MonthlySpend[];
  purchase_history: OrderSummary[];
};

export type SegmentProfile = {
  cluster_id: number;
  segment_name: string;
  customers: number;
  share: number;
  avg_recency_days: number;
  median_recency_days: number;
  avg_frequency: number;
  median_frequency: number;
  avg_monetary: number;
  median_monetary: number;
  total_monetary: number;
  revenue_share: number;
  description: string;
};

export type SegmentsResponse = {
  model_version: string | null;
  cutoff_date: string | null;
  lookback_days: number;
  segments: SegmentProfile[];
  status: 'available' | 'unavailable';
  reason: string | null;
};

export type PredictionItem = {
  customer_id: string;
  prediction_type: string;
  cutoff_date: string;
  model_version: string;
  probability: number | null;
  predicted_spend: number | null;
  rank: number | null;
  segment_name: string | null;
};

export type PredictionsMeta = {
  status: 'available' | 'unavailable';
  prediction_type: string;
  model_version: string | null;
  cutoff_date: string | null;
  scored_customers: number;
  reason: string | null;
};

export type PredictionsResponse = {
  meta: PredictionsMeta;
  results: Paginated<PredictionItem>;
};

export type MetricEntry = {
  name: string;
  label: string;
  value: number | null;
  ci_low: number | null;
  ci_high: number | null;
  higher_is_better: boolean | null;
};

export type ModelComparisonRow = {
  model_name: string;
  algorithm: string;
  is_baseline: boolean;
  is_selected: boolean;
  validation_metrics: Record<string, number | null>;
  test_metrics: Record<string, number | null> | null;
};

export type CalibrationBin = {
  bin_lower: number;
  bin_upper: number;
  mean_predicted: number;
  observed_rate: number;
  count: number;
};

export type ThresholdRow = {
  threshold: number;
  precision: number;
  recall: number;
  flagged_share: number;
  flagged_count: number;
};

export type ErrorBucket = {
  bucket: string;
  count: number;
  mae: number | null;
  rmse: number | null;
  precision: number | null;
  recall: number | null;
  mean_actual: number | null;
  mean_predicted: number | null;
};

export type ModelRunSummary = {
  model_type: string;
  model_version: string;
  algorithm: string;
  status: string;
  is_active: boolean;
  trained_at: string;
  data_cutoff: string | null;
  scoring_cutoff: string | null;
  train_period: [string, string] | null;
  validation_period: [string, string] | null;
  test_period: [string, string] | null;
  n_train: number | null;
  n_validation: number | null;
  n_test: number | null;
  params: Record<string, unknown>;
  metrics: Record<string, unknown>;
  headline_metrics: MetricEntry[];
  comparison: ModelComparisonRow[];
  feature_names: string[];
  data_version: string | null;
  code_version: string | null;
  mlflow_run_id: string | null;
  limitations: string[];
  calibration: CalibrationBin[] | null;
  thresholds: ThresholdRow[] | null;
  error_analysis: ErrorBucket[] | null;
};

export type ModelsResponse = {
  classification: ModelRunSummary | null;
  regression: ModelRunSummary | null;
  segmentation: ModelRunSummary | null;
  segment_profiles: SegmentProfile[];
};

export type ImportRunSummary = {
  id: number;
  source_path: string;
  source_kind: string;
  file_sha256: string;
  file_size_bytes: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_read: number;
  rows_accepted: number;
  rows_excluded: number;
  rows_flagged: number;
  sheets: Record<string, unknown>[] | null;
  error_message: string | null;
};

export type ReasonCount = {
  reason: string;
  label: string;
  rows: number;
  share: number;
};

export type MissingValueCount = {
  field: string;
  missing_rows: number;
  share: number;
};

export type DuplicateInvestigation = {
  exact_duplicate_rows: number;
  share_of_rows: number;
  duplicate_gross_amount: number;
  share_of_gross_sales: number;
  invoices_affected: number;
  duplicate_rows_with_customer_share: number;
  decision: string;
};

export type CleaningRule = { rule: string; detail: string };

export type DataQualityResponse = {
  dataset: DatasetInfo;
  imports: ImportRunSummary[];
  rows_read: number;
  rows_accepted: number;
  rows_excluded: number;
  rows_flagged: number;
  exclusion_reasons: ReasonCount[];
  flags: ReasonCount[];
  missing_values: MissingValueCount[];
  duplicates: DuplicateInvestigation | null;
  cancellation_invoices: number;
  cancellation_lines: number;
  return_amount: number;
  anonymous_lines: number;
  anonymous_gross_sales: number;
  countries: number;
  products: number;
  identified_customers: number;
  eligible_positive_orders: number;
  cleaning_rules: CleaningRule[];
};

export type CustomerFiltersResponse = {
  segments: string[];
  countries: { country: string; customers: number }[];
  activity: string[];
};

// ---- Query parameters -------------------------------------------------------

export const ACTIVITY_FILTERS = ['active_90', 'active_365', 'inactive_365'] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export const CUSTOMER_SORT_KEYS = [
  'customer_id',
  'last_purchase_at',
  'historical_spend',
  'order_count',
  'repeat_purchase_probability',
  'predicted_spend_30d',
] as const;
export type CustomerSortKey = (typeof CUSTOMER_SORT_KEYS)[number];

export type SortOrder = 'asc' | 'desc';

export type PredictionType = 'repeat_purchase_probability' | 'predicted_spend_30d';

export type OverviewParams = {
  start?: string;
  end?: string;
};

export type CustomerListParams = {
  search?: string;
  segment?: string;
  country?: string;
  activity?: ActivityFilter;
  sort?: CustomerSortKey;
  order?: SortOrder;
  page?: number;
  page_size?: number;
};

export type PredictionsParams = {
  type: PredictionType;
  page?: number;
  page_size?: number;
};
