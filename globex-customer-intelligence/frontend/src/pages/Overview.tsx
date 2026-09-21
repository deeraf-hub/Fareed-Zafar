import type { Data, Layout } from 'plotly.js';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CohortCell, Insight, OverviewKpis, SegmentShare, TrendPoint } from '../api/types';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chart, CHART_COLORS } from '../components/Chart';
import { DateInput } from '../components/DateInput';
import { EmptyState } from '../components/EmptyState';
import { KpiGrid, KpiTile } from '../components/KpiTile';
import { PageHeader } from '../components/PageHeader';
import { QueryState } from '../components/QueryState';
import { useOverview } from '../hooks/queries';
import { formatDate, formatGBP, formatMonth, formatNumber, formatPercent } from '../lib/format';
import { KPI_DEFINITIONS } from '../lib/labels';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DateRange = { start: string; end: string };

function buildTrendData(trend: TrendPoint[]): Data[] {
  const x = trend.map((point) => formatMonth(point.month));
  return [
    {
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Gross sales',
      x,
      y: trend.map((point) => point.gross_sales),
      line: { color: CHART_COLORS.muted, width: 2 },
      marker: { color: CHART_COLORS.muted, size: 6 },
      hovertemplate: 'Gross sales: £%{y:,.0f}<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Net revenue',
      x,
      y: trend.map((point) => point.net_revenue),
      line: { color: CHART_COLORS.accent, width: 2 },
      marker: { color: CHART_COLORS.accent, size: 6 },
      hovertemplate: 'Net revenue: £%{y:,.0f}<extra></extra>',
    },
  ];
}

const TREND_LAYOUT: Partial<Layout> = {
  hovermode: 'x unified',
  yaxis: { tickprefix: '£', tickformat: ',.0f', rangemode: 'tozero' },
  margin: { t: 36 },
};

function buildSegmentChart(segments: SegmentShare[]): { data: Data[]; layout: Partial<Layout>; height: number } {
  // Horizontal bars keep long segment names readable; Plotly draws the first category at the
  // bottom, so sort ascending to put the largest segment on top.
  const sorted = [...segments].sort((a, b) => a.customers - b.customers);
  const data: Data[] = [
    {
      type: 'bar',
      orientation: 'h',
      name: 'Customers',
      y: sorted.map((segment) => segment.segment_name),
      x: sorted.map((segment) => segment.customers),
      marker: { color: CHART_COLORS.navy },
      text: sorted.map((segment) => `${formatNumber(segment.customers)} (${formatPercent(segment.share, 0)})`),
      textposition: 'outside',
      textfont: { color: CHART_COLORS.secondary, size: 11 },
      cliponaxis: false,
      customdata: sorted.map((segment) => (segment.revenue_share === null ? '\u2014' : formatPercent(segment.revenue_share))),
      hovertemplate:
        '%{y}<br>Customers: %{x:,}<br>Share of customers: %{text}<br>Share of revenue: %{customdata}<extra></extra>',
    },
  ];
  const layout: Partial<Layout> = {
    showlegend: false,
    xaxis: { tickformat: ',', rangemode: 'tozero', title: { text: 'Customers' } },
    yaxis: { type: 'category', showgrid: false },
    margin: { l: 8, r: 80, t: 16, b: 48 },
  };
  return { data, layout, height: Math.max(220, 72 + sorted.length * 36) };
}

function buildCohortChart(cells: CohortCell[]): { data: Data[]; layout: Partial<Layout>; height: number } {
  const cohorts = Array.from(new Set(cells.map((cell) => cell.cohort_month))).sort();
  const offsets = Array.from(new Set(cells.map((cell) => cell.months_since_first))).sort((a, b) => a - b);
  const lookup = new Map(cells.map((cell) => [`${cell.cohort_month}|${cell.months_since_first}`, cell]));
  const z = cohorts.map((cohort) => offsets.map((offset) => lookup.get(`${cohort}|${offset}`)?.repeat_rate ?? null));
  const sizes = cohorts.map((cohort) => offsets.map((offset) => lookup.get(`${cohort}|${offset}`)?.cohort_size ?? null));
  // Month 0 is 100% by definition; scale the colours to the later months so they stay readable.
  const laterRates = cells.filter((cell) => cell.months_since_first > 0).map((cell) => cell.repeat_rate);
  const zmax = laterRates.length > 0 ? Math.max(...laterRates) : 1;

  const data: Data[] = [
    {
      type: 'heatmap',
      x: offsets,
      y: cohorts.map((cohort) => formatMonth(cohort)),
      z,
      customdata: sizes,
      colorscale: [
        [0, CHART_COLORS.accentSoft],
        [1, CHART_COLORS.accent],
      ],
      zmin: 0,
      zmax,
      hoverongaps: false,
      xgap: 2,
      ygap: 2,
      colorbar: { title: { text: 'Repeat rate' }, tickformat: '.0%', thickness: 12, outlinewidth: 0 },
      hovertemplate:
        'Cohort %{y}<br>Month +%{x}<br>Repeat rate: %{z:.1%}<br>Cohort size: %{customdata:,}<extra></extra>',
    },
  ];
  const layout: Partial<Layout> = {
    xaxis: { title: { text: 'Months since first purchase' }, dtick: 1, showgrid: false },
    yaxis: { type: 'category', autorange: 'reversed', showgrid: false },
    margin: { l: 72, r: 72, t: 16, b: 56 },
  };
  return { data, layout, height: Math.max(280, 60 + cohorts.length * 26) };
}

function SupportingMetrics({ kpis }: { kpis: OverviewKpis }) {
  const items = [
    { ...KPI_DEFINITIONS.average_order_value, value: formatGBP(kpis.average_order_value) },
    { ...KPI_DEFINITIONS.return_rate, value: formatPercent(kpis.return_rate) },
    { label: 'Returns', definition: 'Value of cancellations and returns recorded in the period; shown as a negative amount because it is deducted from gross sales.', value: formatGBP(kpis.return_amount) },
    { ...KPI_DEFINITIONS.anonymous_orders, value: formatNumber(kpis.anonymous_orders) },
  ];
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-secondary">
      {items.map((item) => (
        <div key={item.label} className="flex gap-1" title={item.definition}>
          <dt>{item.label}:</dt>
          <dd className="font-medium tabular-nums text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function InsightsList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return <EmptyState compact title="No insights for this period." />;
  }
  return (
    <ul className="space-y-3">
      {insights.map((insight, index) => (
        <li
          key={`${insight.title}-${index}`}
          className={`rounded-md border border-line px-4 py-3 ${insight.kind === 'caution' ? 'border-l-4 border-l-caution' : ''}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink">{insight.title}</p>
            {insight.kind === 'caution' && <Badge tone="caution">Caution</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-secondary">{insight.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function OverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = {
    start: searchParams.get('start') ?? undefined,
    end: searchParams.get('end') ?? undefined,
  };
  const query = useOverview(applied);
  const [draft, setDraft] = useState<DateRange | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const inputs: DateRange = draft ?? {
    start: applied.start ?? query.data?.period_start ?? '',
    end: applied.end ?? query.data?.period_end ?? '',
  };
  const isCustomPeriod = Boolean(applied.start || applied.end);
  const isUpdating = query.isFetching && query.isPlaceholderData;

  function onApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!DATE_PATTERN.test(inputs.start) || !DATE_PATTERN.test(inputs.end)) {
      setValidationError('Choose both a start date and an end date.');
      return;
    }
    if (inputs.start > inputs.end) {
      setValidationError('The start date must be on or before the end date.');
      return;
    }
    setValidationError(null);
    setDraft(null);
    setSearchParams({ start: inputs.start, end: inputs.end });
  }

  function onReset() {
    setValidationError(null);
    setDraft(null);
    setSearchParams({});
  }

  const periodLabel = query.data
    ? `Period ${formatDate(query.data.period_start)} – ${formatDate(query.data.period_end)}`
    : 'Sales, customers and segments for the selected period.';

  return (
    <>
      <PageHeader
        title="Overview"
        description={periodLabel}
        meta={isCustomPeriod ? <Badge tone="accent">Custom period</Badge> : undefined}
        actions={
          <form onSubmit={onApply} noValidate aria-label="Date range" className="flex flex-wrap items-end gap-3">
            <DateInput
              id="overview-start"
              label="Start date"
              value={inputs.start}
              max={inputs.end || undefined}
              onChange={(value) => setDraft({ ...inputs, start: value })}
              invalid={Boolean(validationError)}
              describedBy={validationError ? 'overview-date-error' : undefined}
              className="w-40"
            />
            <DateInput
              id="overview-end"
              label="End date"
              value={inputs.end}
              min={inputs.start || undefined}
              onChange={(value) => setDraft({ ...inputs, end: value })}
              invalid={Boolean(validationError)}
              describedBy={validationError ? 'overview-date-error' : undefined}
              className="w-40"
            />
            <div className="flex gap-2">
              <Button type="submit">Apply</Button>
              <Button type="button" variant="secondary" onClick={onReset}>
                Reset
              </Button>
            </div>
          </form>
        }
      />
      {validationError && (
        <p id="overview-date-error" role="alert" className="mb-4 text-sm font-medium text-caution">
          {validationError}
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {isUpdating ? 'Updating overview for the selected period.' : ''}
      </p>

      <QueryState query={query} loadingText="Loading overview…" errorTitle="Could not load the overview">
        {(data) => {
          const cohort = data.cohorts.length > 0 ? buildCohortChart(data.cohorts) : null;
          const segmentChart = buildSegmentChart(data.segment_distribution);
          return (
            <div className={`space-y-6 ${isUpdating ? 'opacity-70' : ''}`}>
              <section aria-label="Key performance indicators">
                <KpiGrid className="xl:grid-cols-5">
                  <KpiTile
                    label={KPI_DEFINITIONS.gross_sales.label}
                    value={formatGBP(data.kpis.gross_sales)}
                    helper={KPI_DEFINITIONS.gross_sales.helper}
                    definition={KPI_DEFINITIONS.gross_sales.definition}
                  />
                  <KpiTile
                    label={KPI_DEFINITIONS.net_revenue.label}
                    value={formatGBP(data.kpis.net_revenue)}
                    helper={KPI_DEFINITIONS.net_revenue.helper}
                    definition={KPI_DEFINITIONS.net_revenue.definition}
                  />
                  <KpiTile
                    label={KPI_DEFINITIONS.orders.label}
                    value={formatNumber(data.kpis.orders)}
                    helper={KPI_DEFINITIONS.orders.helper}
                    definition={KPI_DEFINITIONS.orders.definition}
                  />
                  <KpiTile
                    label={KPI_DEFINITIONS.purchasing_customers.label}
                    value={formatNumber(data.kpis.purchasing_customers)}
                    helper={KPI_DEFINITIONS.purchasing_customers.helper}
                    definition={KPI_DEFINITIONS.purchasing_customers.definition}
                  />
                  <KpiTile
                    label={KPI_DEFINITIONS.repeat_purchase_rate.label}
                    value={formatPercent(data.kpis.repeat_purchase_rate)}
                    helper={KPI_DEFINITIONS.repeat_purchase_rate.helper}
                    definition={KPI_DEFINITIONS.repeat_purchase_rate.definition}
                  />
                </KpiGrid>
                <SupportingMetrics kpis={data.kpis} />
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Revenue trend" description="Gross sales and net revenue by month (GBP).">
                  {data.revenue_trend.length === 0 ? (
                    <EmptyState compact title="No sales in this period." />
                  ) : (
                    <Chart
                      title="Revenue trend"
                      description="Monthly gross sales and net revenue for the selected period."
                      data={buildTrendData(data.revenue_trend)}
                      layout={TREND_LAYOUT}
                      height={300}
                    />
                  )}
                </Card>
                <Card
                  title="Customer segment distribution"
                  description={
                    data.segmentation_model_version
                      ? `Customers per segment · model ${data.segmentation_model_version}`
                      : 'Customers per segment.'
                  }
                >
                  {data.segment_distribution.length === 0 ? (
                    <EmptyState
                      compact
                      title="Segmentation not available"
                      description="No active segmentation model has assigned customers to segments."
                    />
                  ) : (
                    <Chart
                      title="Customer segment distribution"
                      description="Number of customers in each segment, labelled with each segment's share of customers."
                      data={segmentChart.data}
                      layout={segmentChart.layout}
                      height={segmentChart.height}
                    />
                  )}
                </Card>
              </div>

              <Card
                title="Cohort repeat purchases"
                description="Share of each first-purchase cohort that ordered again, by months since first purchase. Hover a cell for the cohort size."
              >
                {cohort === null ? (
                  <EmptyState compact title="No cohort data for this period." />
                ) : (
                  <Chart
                    title="Cohort repeat-purchase heatmap"
                    description="Rows are first-purchase cohorts by month, columns are months since first purchase, and cell shading is the repeat-purchase rate."
                    data={cohort.data}
                    layout={cohort.layout}
                    height={cohort.height}
                  />
                )}
              </Card>

              <Card title="Insights" description="Observations computed from the selected period. Cautions flag data limitations.">
                <InsightsList insights={data.insights} />
              </Card>
            </div>
          );
        }}
      </QueryState>
    </>
  );
}
