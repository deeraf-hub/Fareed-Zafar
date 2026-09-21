// Test-only fixtures shaped exactly like the API contract. Never imported by app code.
import type {
  CustomerDetail,
  CustomerFiltersResponse,
  CustomerListItem,
  DatasetInfo,
  OverviewResponse,
  Paginated,
  PredictionValue,
} from '../api/types';

export const datasetFixture: DatasetInfo = {
  name: 'Online Retail II',
  source_url: 'https://archive.ics.uci.edu/dataset/502/online+retail+ii',
  attribution: 'Chen, D. (2019). Online Retail II. UCI Machine Learning Repository.',
  license: 'CC BY 4.0',
  mode: 'historical_demo',
  first_transaction_at: '2009-12-01T07:45:00',
  last_transaction_at: '2011-12-09T12:50:00',
  data_cutoff: '2011-12-09',
  last_processed_at: '2024-05-01T10:00:00',
};

export const availableProbability: PredictionValue = {
  status: 'available',
  value: 0.42,
  cutoff_date: '2011-12-09',
  model_version: 'clf-2024-05-01',
  rank: 12,
  reason: null,
};

export const availableSpend: PredictionValue = {
  status: 'available',
  value: 123.45,
  cutoff_date: '2011-12-09',
  model_version: 'reg-2024-05-01',
  rank: 40,
  reason: null,
};

export const unavailablePrediction: PredictionValue = {
  status: 'unavailable',
  value: null,
  cutoff_date: null,
  model_version: null,
  rank: null,
  reason: 'Customer has no eligible orders before the cutoff.',
};

export const customerItems: CustomerListItem[] = [
  {
    customer_id: '17850',
    segment_name: 'Champions',
    country: 'United Kingdom',
    last_purchase_at: '2011-12-09T12:50:00',
    historical_spend: 5391.21,
    order_count: 34,
    repeat_purchase_probability: availableProbability,
    predicted_spend_30d: availableSpend,
  },
  {
    customer_id: '13047',
    segment_name: null,
    country: 'Germany',
    last_purchase_at: '2010-01-15T10:00:00',
    historical_spend: 210.5,
    order_count: 1,
    repeat_purchase_probability: unavailablePrediction,
    predicted_spend_30d: unavailablePrediction,
  },
];

export const customersPageFixture: Paginated<CustomerListItem> = {
  items: customerItems,
  page: 1,
  page_size: 25,
  total: 2,
  total_pages: 1,
};

export const filtersFixture: CustomerFiltersResponse = {
  segments: ['Champions', 'At risk'],
  countries: [
    { country: 'United Kingdom', customers: 3950 },
    { country: 'Germany', customers: 95 },
  ],
  activity: ['active_90', 'active_365', 'inactive_365'],
};

export const overviewFixture: OverviewResponse = {
  dataset: datasetFixture,
  period_start: '2009-12-01',
  period_end: '2011-12-09',
  kpis: {
    gross_sales: 8887209.5,
    net_revenue: 8250000,
    return_amount: 637209.5,
    orders: 19960,
    purchasing_customers: 4338,
    anonymous_orders: 1450,
    average_order_value: 445.25,
    repeat_purchase_rate: 0.6512,
    return_rate: 0.0717,
  },
  revenue_trend: [
    { month: '2011-10', gross_sales: 900000, net_revenue: 850000, orders: 1800, purchasing_customers: 1200 },
    { month: '2011-11', gross_sales: 1200000, net_revenue: 1100000, orders: 2400, purchasing_customers: 1500 },
    { month: '2011-12', gross_sales: 400000, net_revenue: 380000, orders: 700, purchasing_customers: 600 },
  ],
  segment_distribution: [
    { segment_name: 'Champions', cluster_id: 0, customers: 900, share: 0.21, revenue_share: 0.55 },
    { segment_name: 'At risk', cluster_id: 1, customers: 1400, share: 0.32, revenue_share: 0.12 },
  ],
  segmentation_model_version: 'seg-2024-05-01',
  cohorts: [
    { cohort_month: '2011-01', months_since_first: 0, cohort_size: 400, active_customers: 400, repeat_rate: 1 },
    { cohort_month: '2011-01', months_since_first: 1, cohort_size: 400, active_customers: 120, repeat_rate: 0.3 },
    { cohort_month: '2011-02', months_since_first: 0, cohort_size: 350, active_customers: 350, repeat_rate: 1 },
    { cohort_month: '2011-02', months_since_first: 1, cohort_size: 350, active_customers: 91, repeat_rate: 0.26 },
  ],
  insights: [
    { title: 'November is the peak month', detail: 'Gross sales in November 2011 were the highest of the period.', kind: 'observation' },
    { title: 'Anonymous orders are excluded from customer metrics', detail: '1,450 orders have no customer ID.', kind: 'caution' },
  ],
};

export const customerDetailFixture: CustomerDetail = {
  customer_id: '17850',
  country: 'United Kingdom',
  first_purchase_at: '2010-12-01T08:26:00',
  last_purchase_at: '2011-12-09T12:50:00',
  order_count: 34,
  return_order_count: 2,
  gross_sales: 5600.1,
  return_amount: 208.89,
  net_revenue: 5391.21,
  distinct_products: 120,
  segment_name: 'Champions',
  rfm: {
    cutoff_date: '2011-12-09',
    lookback_days: 365,
    recency_days: 0,
    frequency: 20,
    monetary: 3200.5,
    segment_name: 'Champions',
    cluster_id: 0,
    model_version: 'seg-2024-05-01',
  },
  repeat_purchase_probability: availableProbability,
  predicted_spend_30d: availableSpend,
  behavioural_indicators: [
    { name: 'days_since_last_order', label: 'Days since last order', value: 0, unit: 'days' },
    { name: 'orders_90d', label: 'Orders in last 90 days', value: 5, unit: 'count' },
    { name: 'spend_90d', label: 'Spending in last 90 days', value: 812.4, unit: 'gbp' },
    { name: 'return_ratio', label: 'Return ratio', value: 0.04, unit: 'ratio' },
  ],
  spend_trend: [
    { month: '2011-11', gross_sales: 600, net_revenue: 590, orders: 3 },
    { month: '2011-12', gross_sales: 200, net_revenue: 200, orders: 1 },
  ],
  purchase_history: [
    { invoice: '581483', order_at: '2011-12-09T12:50:00', is_cancellation: false, line_count: 4, units: 40, gross_amount: 200, return_amount: 0, net_amount: 200 },
    { invoice: 'C580000', order_at: '2011-12-01T09:00:00', is_cancellation: true, line_count: 1, units: 2, gross_amount: 0, return_amount: 15, net_amount: -15 },
  ],
};
