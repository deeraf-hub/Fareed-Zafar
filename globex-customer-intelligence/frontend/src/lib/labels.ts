import { humanize } from './format';

// Product wording used consistently across screens.
export const PREDICTION_LABELS = {
  repeat_purchase_probability: '30-day repeat-purchase likelihood',
  predicted_spend_30d: 'Predicted 30-day purchase spending',
} as const;

export const PREDICTION_DEFINITIONS = {
  repeat_purchase_probability:
    'Estimated probability that the customer places another order in the 30 days after the data cutoff.',
  predicted_spend_30d:
    'Estimated purchase spending (GBP) by the customer in the 30 days after the data cutoff.',
} as const;

export const KPI_DEFINITIONS = {
  gross_sales: {
    label: 'Gross sales',
    helper: 'Eligible positive sales before returns',
    definition: 'Sum of eligible positive sales lines in the period, before cancellations and returns are deducted.',
  },
  net_revenue: {
    label: 'Net revenue',
    helper: 'Gross sales minus returns',
    definition: 'Gross sales less the value of cancellations and returns recorded in the period.',
  },
  orders: {
    label: 'Orders',
    helper: 'Distinct positive invoices',
    definition: 'Number of distinct non-cancellation invoices in the period, including anonymous orders.',
  },
  purchasing_customers: {
    label: 'Purchasing customers',
    helper: 'Identified customers with at least one order',
    definition: 'Distinct identified customers who placed at least one order in the period. Anonymous orders are excluded.',
  },
  repeat_purchase_rate: {
    label: 'Repeat-purchase rate',
    helper: 'Share of purchasing customers with 2+ orders',
    definition: 'Share of purchasing customers in the period who placed more than one order.',
  },
  average_order_value: {
    label: 'Average order value',
    helper: 'Gross sales per order',
    definition: 'Gross sales divided by the number of orders in the period.',
  },
  return_rate: {
    label: 'Return rate',
    helper: 'Returns as a share of gross sales',
    definition: 'Value of cancellations and returns divided by gross sales in the period.',
  },
  anonymous_orders: {
    label: 'Anonymous orders',
    helper: 'Orders without a customer ID',
    definition: 'Orders in the period that have no customer identifier and so cannot be attributed to a customer.',
  },
} as const;

/** Readable names for metric keys in comparison tables; unknown keys are humanised. */
const METRIC_LABELS: Record<string, string> = {
  n: 'n',
  f1: 'F1',
  roc_auc: 'ROC AUC',
  mae: 'MAE',
  rmse: 'RMSE',
  average_precision: 'Average precision',
  precision: 'Precision',
  recall: 'Recall',
  brier_score: 'Brier score',
  base_rate: 'Base rate',
  lift_at_100: 'Lift at 100',
  precision_at_100: 'Precision at 100',
  flagged_share: 'Flagged share',
  ranking_size: 'Ranking size',
  threshold: 'Threshold',
  mean_actual: 'Mean actual',
  mean_predicted: 'Mean predicted',
  mae_zero_spend: 'MAE zero spend',
  mae_high_spend: 'MAE high spend',
  baseline_mae: 'Baseline MAE',
  baseline_rmse: 'Baseline RMSE',
  share_zero_actual: 'Share zero actual',
  silhouette: 'Silhouette',
  stability_ari: 'Stability (ARI)',
  min_cluster_share: 'Min cluster share',
  n_clusters: 'Clusters',
};

export function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? humanize(key);
}
