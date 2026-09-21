import type { Data, Layout } from 'plotly.js';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isApiError } from '../api/client';
import type { BehaviouralIndicator, CustomerDetail, MonthlySpend, OrderSummary, PredictionValue } from '../api/types';
import { Badge } from '../components/Badge';
import { buttonClasses } from '../components/Button';
import { Card } from '../components/Card';
import { Chart, CHART_COLORS } from '../components/Chart';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { KeyValueList } from '../components/KeyValueList';
import { KpiGrid, KpiTile } from '../components/KpiTile';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { DEFAULT_UNAVAILABLE_REASON, formatPredictionValue } from '../components/PredictionCell';
import { useCustomer } from '../hooks/queries';
import {
  EM_DASH,
  formatDate,
  formatDateTime,
  formatDays,
  formatGBP,
  formatIndicator,
  formatMonth,
  formatNumber,
} from '../lib/format';
import { PREDICTION_DEFINITIONS, PREDICTION_LABELS } from '../lib/labels';

const HISTORY_PAGE_SIZE = 20;

function buildSpendData(trend: MonthlySpend[]): Data[] {
  const x = trend.map((point) => formatMonth(point.month));
  return [
    {
      type: 'bar',
      name: 'Gross sales',
      x,
      y: trend.map((point) => point.gross_sales),
      marker: { color: CHART_COLORS.muted },
      hovertemplate: 'Gross sales: £%{y:,.2f}<extra></extra>',
    },
    {
      type: 'bar',
      name: 'Net revenue',
      x,
      y: trend.map((point) => point.net_revenue),
      marker: { color: CHART_COLORS.accent },
      customdata: trend.map((point) => point.orders),
      hovertemplate: 'Net revenue: £%{y:,.2f}<br>Orders: %{customdata}<extra></extra>',
    },
  ];
}

const SPEND_LAYOUT: Partial<Layout> = {
  barmode: 'group',
  bargap: 0.3,
  hovermode: 'x unified',
  yaxis: { tickprefix: '£', tickformat: ',.0f' },
  margin: { t: 36 },
};

function PredictionBlock({ label, definition, prediction, kind }: { label: string; definition: string; prediction: PredictionValue; kind: 'probability' | 'gbp' }) {
  const available = prediction.status === 'available' && prediction.value !== null;
  return (
    <div>
      <h3 className="text-sm font-medium text-ink-secondary" title={definition}>
        {label}
      </h3>
      {available ? (
        <>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{formatPredictionValue(prediction, kind)}</p>
          <p className="mt-1 text-sm text-ink">
            As of <time dateTime={prediction.cutoff_date ?? undefined}>{formatDate(prediction.cutoff_date)}</time> &middot; model{' '}
            <span className="font-mono text-xs">{prediction.model_version ?? 'unknown'}</span>
          </p>
          {prediction.rank !== null && (
            <p className="mt-0.5 text-xs text-ink-secondary">Rank {formatNumber(prediction.rank)} among scored customers</p>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold text-ink-secondary">Unavailable</p>
          <p className="mt-1 text-sm text-ink-secondary">{prediction.reason?.trim() || DEFAULT_UNAVAILABLE_REASON}</p>
        </>
      )}
    </div>
  );
}

const INDICATOR_COLUMNS: Column<BehaviouralIndicator>[] = [
  { id: 'label', header: 'Indicator', render: (row) => <span title={row.name}>{row.label || row.name}</span> },
  { id: 'value', header: 'Value', align: 'right', nowrap: true, render: (row) => formatIndicator(row.value, row.unit) },
];

const HISTORY_COLUMNS: Column<OrderSummary>[] = [
  { id: 'invoice', header: 'Invoice', nowrap: true, render: (row) => <span className="font-mono text-sm">{row.invoice}</span> },
  { id: 'order_at', header: 'Date', nowrap: true, render: (row) => formatDateTime(row.order_at) },
  {
    id: 'type',
    header: 'Type',
    render: (row) => (row.is_cancellation ? <Badge tone="caution">Cancellation</Badge> : <Badge tone="neutral">Order</Badge>),
  },
  { id: 'line_count', header: 'Lines', align: 'right', render: (row) => formatNumber(row.line_count) },
  { id: 'units', header: 'Units', align: 'right', render: (row) => formatNumber(row.units) },
  { id: 'gross_amount', header: 'Gross', align: 'right', nowrap: true, render: (row) => formatGBP(row.gross_amount) },
  { id: 'return_amount', header: 'Returns', align: 'right', nowrap: true, render: (row) => formatGBP(row.return_amount) },
  { id: 'net_amount', header: 'Net', align: 'right', nowrap: true, render: (row) => formatGBP(row.net_amount) },
];

function PurchaseHistory({ orders }: { orders: OrderSummary[] }) {
  const [page, setPage] = useState(1);
  const sorted = useMemo(
    () => [...orders].sort((a, b) => (a.order_at < b.order_at ? 1 : a.order_at > b.order_at ? -1 : 0)),
    [orders],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * HISTORY_PAGE_SIZE, currentPage * HISTORY_PAGE_SIZE);

  if (sorted.length === 0) {
    return <EmptyState compact title="No orders recorded for this customer." />;
  }
  return (
    <div className="space-y-4">
      <DataTable columns={HISTORY_COLUMNS} rows={pageRows} rowKey={(row) => `${row.invoice}-${row.order_at}`} dense caption="Purchase history, newest first" />
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={sorted.length}
        pageSize={HISTORY_PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="orders"
        idPrefix="history"
      />
    </div>
  );
}

function CustomerContent({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="space-y-6">
      <section aria-label="Customer summary">
        <KpiGrid className="md:grid-cols-4">
          <KpiTile
            label="Orders"
            value={formatNumber(customer.order_count)}
            helper={`${formatNumber(customer.return_order_count)} cancellation ${customer.return_order_count === 1 ? 'order' : 'orders'}`}
            definition="Non-cancellation orders up to the data cutoff; the helper counts cancellation invoices."
          />
          <KpiTile label="Gross sales" value={formatGBP(customer.gross_sales)} helper="Before returns" definition="Sum of eligible positive sales lines for this customer." />
          <KpiTile label="Net revenue" value={formatGBP(customer.net_revenue)} helper="Gross sales minus returns" definition="Gross sales less cancellations and returns." />
          <KpiTile label="Returns" value={formatGBP(customer.return_amount)} helper="Cancellation and return value" definition="Value of cancellation and return lines for this customer." />
          <KpiTile label="Distinct products" value={formatNumber(customer.distinct_products)} helper="Unique stock codes purchased" />
          <KpiTile label="First purchase" value={formatDate(customer.first_purchase_at)} helper="Earliest order date" />
          <KpiTile label="Last purchase" value={formatDate(customer.last_purchase_at)} helper="Most recent order date" />
        </KpiGrid>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Predictions" description="Scores from the active models at the data cutoff.">
          <div className="grid gap-6 sm:grid-cols-2">
            <PredictionBlock
              label={PREDICTION_LABELS.repeat_purchase_probability}
              definition={PREDICTION_DEFINITIONS.repeat_purchase_probability}
              prediction={customer.repeat_purchase_probability}
              kind="probability"
            />
            <PredictionBlock
              label={PREDICTION_LABELS.predicted_spend_30d}
              definition={PREDICTION_DEFINITIONS.predicted_spend_30d}
              prediction={customer.predicted_spend_30d}
              kind="gbp"
            />
          </div>
        </Card>

        <Card title="RFM profile" description="Recency, frequency and monetary value used for segmentation.">
          {customer.rfm === null ? (
            <EmptyState compact title="RFM profile not available" description="No segmentation model has profiled this customer." />
          ) : (
            <KeyValueList
              columns={3}
              items={[
                { label: 'Recency', value: formatDays(customer.rfm.recency_days), title: 'Days between the last order and the cutoff date' },
                { label: 'Frequency', value: `${formatNumber(customer.rfm.frequency)} ${customer.rfm.frequency === 1 ? 'order' : 'orders'}`, title: 'Orders within the lookback window' },
                { label: 'Monetary', value: formatGBP(customer.rfm.monetary), title: 'Net spending within the lookback window' },
                { label: 'Lookback window', value: formatDays(customer.rfm.lookback_days) },
                { label: 'Cutoff date', value: formatDate(customer.rfm.cutoff_date) },
                {
                  label: 'Segment',
                  value: customer.rfm.segment_name
                    ? `${customer.rfm.segment_name}${customer.rfm.cluster_id !== null ? ` (cluster ${customer.rfm.cluster_id})` : ''}`
                    : EM_DASH,
                },
                { label: 'Model version', value: <span className="font-mono text-xs">{customer.rfm.model_version ?? EM_DASH}</span> },
              ]}
            />
          )}
        </Card>
      </div>

      <Card title="Spending trend" description="Monthly gross sales and net revenue for this customer (GBP).">
        {customer.spend_trend.length === 0 ? (
          <EmptyState compact title="No monthly spending recorded." />
        ) : (
          <Chart
            title="Spending trend"
            description="Monthly gross sales and net revenue for this customer."
            data={buildSpendData(customer.spend_trend)}
            layout={SPEND_LAYOUT}
            height={280}
          />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Historical behavioural indicators" className="lg:col-span-2">
          {customer.behavioural_indicators.length === 0 ? (
            <EmptyState compact title="No indicators recorded." />
          ) : (
            <DataTable
              columns={INDICATOR_COLUMNS}
              rows={customer.behavioural_indicators}
              rowKey={(row) => row.name}
              dense
              captionHidden={false}
              caption="Descriptive values used by the model at the cutoff. They are not causal explanations."
            />
          )}
        </Card>
        <Card title="Purchase history" description="All invoices for this customer, newest first." className="lg:col-span-3">
          <PurchaseHistory orders={customer.purchase_history} />
        </Card>
      </div>
    </div>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useCustomer(id);
  const customer = query.data;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/customers" className="link">
            &larr; Customers
          </Link>
        }
        title={`Customer ${id ?? ''}`}
        description={customer ? 'Historical behaviour, segment and predictions for this customer.' : undefined}
        meta={
          customer ? (
            <>
              <Badge tone="neutral">Country: {customer.country ?? EM_DASH}</Badge>
              <Badge tone={customer.segment_name ? 'accent' : 'neutral'}>Segment: {customer.segment_name ?? EM_DASH}</Badge>
            </>
          ) : undefined
        }
      />
      {query.isPending ? (
        <LoadingState text="Loading customer…" rows={6} />
      ) : query.isError ? (
        isApiError(query.error) && query.error.status === 404 ? (
          <EmptyState
            title="Customer not found"
            description={query.error.message}
            action={
              <Link to="/customers" className={buttonClasses('secondary', 'sm')}>
                Back to customers
              </Link>
            }
          />
        ) : (
          <ErrorState error={query.error} title="Could not load customer" onRetry={() => void query.refetch()} />
        )
      ) : (
        <CustomerContent customer={query.data} />
      )}
    </>
  );
}
