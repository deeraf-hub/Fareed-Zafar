import type { CleaningRule, ImportRunSummary, MissingValueCount, ReasonCount } from '../api/types';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { KeyValueList } from '../components/KeyValueList';
import { KpiGrid, KpiTile } from '../components/KpiTile';
import { PageHeader } from '../components/PageHeader';
import { QueryState } from '../components/QueryState';
import { useDataQuality } from '../hooks/queries';
import { EM_DASH, formatBytes, formatDate, formatDateTime, formatGBP, formatNumber, formatPercent } from '../lib/format';

function statusTone(status: string): 'accent' | 'caution' | 'neutral' {
  const normalised = status.toLowerCase();
  if (normalised.includes('fail') || normalised.includes('error')) return 'caution';
  if (normalised.includes('success') || normalised.includes('complete') || normalised === 'ok') return 'accent';
  return 'neutral';
}

const IMPORT_COLUMNS: Column<ImportRunSummary>[] = [
  { id: 'id', header: 'Run', align: 'right', render: (row) => formatNumber(row.id) },
  {
    id: 'source',
    header: 'Source',
    render: (row) => (
      <span>
        <span className="block break-all font-mono text-xs text-ink">{row.source_path}</span>
        <span className="block text-xs text-ink-secondary">
          {row.source_kind}
          {row.sheets && row.sheets.length > 0 ? ` \u00b7 ${formatNumber(row.sheets.length)} ${row.sheets.length === 1 ? 'sheet' : 'sheets'}` : ''}
        </span>
      </span>
    ),
  },
  { id: 'started_at', header: 'Started', nowrap: true, render: (row) => formatDateTime(row.started_at) },
  { id: 'finished_at', header: 'Finished', nowrap: true, render: (row) => formatDateTime(row.finished_at) },
  { id: 'status', header: 'Status', render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
  { id: 'rows_read', header: 'Rows read', align: 'right', render: (row) => formatNumber(row.rows_read) },
  { id: 'rows_accepted', header: 'Accepted', align: 'right', render: (row) => formatNumber(row.rows_accepted) },
  { id: 'rows_excluded', header: 'Excluded', align: 'right', render: (row) => formatNumber(row.rows_excluded) },
  { id: 'rows_flagged', header: 'Flagged', align: 'right', render: (row) => formatNumber(row.rows_flagged) },
  { id: 'file_size_bytes', header: 'File size', align: 'right', nowrap: true, render: (row) => formatBytes(row.file_size_bytes) },
  {
    id: 'file_sha256',
    header: 'SHA-256',
    render: (row) => (
      <span className="font-mono text-xs" title={row.file_sha256}>
        {row.file_sha256.slice(0, 12)}&hellip;
      </span>
    ),
  },
  {
    id: 'error_message',
    header: 'Error',
    className: 'text-sm text-caution',
    render: (row) => row.error_message ?? <span className="text-ink-secondary">{EM_DASH}</span>,
  },
];

const REASON_COLUMNS: Column<ReasonCount>[] = [
  { id: 'label', header: 'Reason', render: (row) => <span title={row.reason}>{row.label || row.reason}</span> },
  { id: 'rows', header: 'Rows', align: 'right', render: (row) => formatNumber(row.rows) },
  { id: 'share', header: 'Share of rows read', align: 'right', render: (row) => formatPercent(row.share, 2) },
];

const MISSING_COLUMNS: Column<MissingValueCount>[] = [
  { id: 'field', header: 'Field', render: (row) => <span className="font-mono text-sm">{row.field}</span> },
  { id: 'missing_rows', header: 'Missing rows', align: 'right', render: (row) => formatNumber(row.missing_rows) },
  { id: 'share', header: 'Share of rows read', align: 'right', render: (row) => formatPercent(row.share, 2) },
];

function ReasonTable({ rows, caption, emptyTitle }: { rows: ReasonCount[]; caption: string; emptyTitle: string }) {
  if (rows.length === 0) return <EmptyState compact title={emptyTitle} />;
  return <DataTable columns={REASON_COLUMNS} rows={rows} rowKey={(row) => row.reason} dense caption={caption} />;
}

function CleaningRules({ rules }: { rules: CleaningRule[] }) {
  if (rules.length === 0) return <EmptyState compact title="No cleaning rules recorded." />;
  return (
    <ol className="space-y-3 pl-5 text-sm [list-style-type:decimal]">
      {rules.map((rule, index) => (
        <li key={`${rule.rule}-${index}`}>
          <p className="font-medium text-ink">{rule.rule}</p>
          <p className="text-ink-secondary">{rule.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export function DataQualityPage() {
  const query = useDataQuality();
  return (
    <>
      <PageHeader
        title="Data Quality"
        description="Where the data comes from, how it was validated and cleaned, and what was excluded or flagged."
      />
      <QueryState query={query} loadingText="Loading data quality report…" errorTitle="Could not load the data quality report">
        {(report) => {
          const share = (value: number) => (report.rows_read > 0 ? formatPercent(value / report.rows_read) : EM_DASH);
          return (
            <div className="space-y-6">
              <Card title="Dataset source">
                <KeyValueList
                  columns={3}
                  items={[
                    { label: 'Name', value: report.dataset.name },
                    {
                      label: 'Source',
                      value: (
                        <a href={report.dataset.source_url} className="link break-all" target="_blank" rel="noreferrer">
                          {report.dataset.source_url}
                        </a>
                      ),
                    },
                    { label: 'Mode', value: report.dataset.mode === 'historical_demo' ? 'Historical demo' : report.dataset.mode },
                    { label: 'Attribution', value: report.dataset.attribution },
                    { label: 'License', value: report.dataset.license },
                    {
                      label: 'Coverage',
                      value: `${formatDate(report.dataset.first_transaction_at)} → ${formatDate(report.dataset.last_transaction_at)}`,
                    },
                    { label: 'Data cutoff', value: formatDate(report.dataset.data_cutoff) },
                    { label: 'Last processed', value: formatDateTime(report.dataset.last_processed_at) },
                  ]}
                />
              </Card>

              <section aria-label="Validation summary">
                <KpiGrid className="md:grid-cols-4">
                  <KpiTile label="Rows read" value={formatNumber(report.rows_read)} helper="Lines in the source file(s)" definition="Total rows read from the raw source before validation." />
                  <KpiTile label="Rows accepted" value={formatNumber(report.rows_accepted)} helper={`${share(report.rows_accepted)} of rows read`} definition="Rows that passed validation and were loaded." />
                  <KpiTile label="Rows excluded" value={formatNumber(report.rows_excluded)} helper={`${share(report.rows_excluded)} of rows read`} definition="Rows dropped by a cleaning rule; see exclusion reasons." />
                  <KpiTile label="Rows flagged" value={formatNumber(report.rows_flagged)} helper={`${share(report.rows_flagged)} of rows read`} definition="Rows kept but marked with a data-quality flag." />
                </KpiGrid>
              </section>

              <Card title="Import history" description="Every import run recorded for this dataset.">
                {report.imports.length === 0 ? (
                  <EmptyState compact title="No imports recorded." description="Run the ingestion command to load the dataset." />
                ) : (
                  <DataTable columns={IMPORT_COLUMNS} rows={report.imports} rowKey={(row) => String(row.id)} dense caption="Import runs" />
                )}
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Exclusion reasons" description="Why rows were dropped.">
                  <ReasonTable rows={report.exclusion_reasons} caption="Exclusion reasons" emptyTitle="No rows were excluded." />
                </Card>
                <Card title="Flags" description="Rows kept but marked for attention.">
                  <ReasonTable rows={report.flags} caption="Data-quality flags" emptyTitle="No rows were flagged." />
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Missing values" description="Fields with empty values in the rows read.">
                  {report.missing_values.length === 0 ? (
                    <EmptyState compact title="No missing values recorded." />
                  ) : (
                    <DataTable columns={MISSING_COLUMNS} rows={report.missing_values} rowKey={(row) => row.field} dense caption="Missing values by field" />
                  )}
                </Card>
                <Card title="Duplicate investigation" description="Exact duplicate rows found in the source and how they were handled.">
                  {report.duplicates === null ? (
                    <EmptyState compact title="No duplicate investigation recorded." />
                  ) : (
                    <div className="space-y-4">
                      <KeyValueList
                        columns={2}
                        items={[
                          { label: 'Exact duplicate rows', value: formatNumber(report.duplicates.exact_duplicate_rows) },
                          { label: 'Share of rows', value: formatPercent(report.duplicates.share_of_rows, 2) },
                          { label: 'Duplicate gross amount', value: formatGBP(report.duplicates.duplicate_gross_amount) },
                          { label: 'Share of gross sales', value: formatPercent(report.duplicates.share_of_gross_sales, 2) },
                          { label: 'Invoices affected', value: formatNumber(report.duplicates.invoices_affected) },
                          {
                            label: 'Duplicate rows with a customer ID',
                            value: formatPercent(report.duplicates.duplicate_rows_with_customer_share, 1),
                          },
                        ]}
                      />
                      <div className="rounded-md border border-line bg-page px-4 py-3">
                        <p className="text-xs font-medium text-ink-secondary">Decision</p>
                        <p className="mt-0.5 text-sm text-ink">{report.duplicates.decision}</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Returns and cancellations" description="Cancellation invoices and the value they reverse.">
                  <KeyValueList
                    columns={3}
                    items={[
                      { label: 'Cancellation invoices', value: formatNumber(report.cancellation_invoices) },
                      { label: 'Cancellation lines', value: formatNumber(report.cancellation_lines) },
                      { label: 'Return amount', value: formatGBP(report.return_amount) },
                      { label: 'Anonymous lines', value: formatNumber(report.anonymous_lines), title: 'Lines without a customer ID' },
                      { label: 'Anonymous gross sales', value: formatGBP(report.anonymous_gross_sales), title: 'Gross sales on lines without a customer ID' },
                    ]}
                  />
                </Card>
                <Card title="Coverage" description="What the accepted rows describe.">
                  <KeyValueList
                    columns={2}
                    items={[
                      { label: 'Countries', value: formatNumber(report.countries) },
                      { label: 'Products', value: formatNumber(report.products) },
                      { label: 'Identified customers', value: formatNumber(report.identified_customers) },
                      { label: 'Eligible positive orders', value: formatNumber(report.eligible_positive_orders) },
                    ]}
                  />
                </Card>
              </div>

              <Card title="Cleaning rules" description="Rules applied during import, in order.">
                <CleaningRules rules={report.cleaning_rules} />
              </Card>
            </div>
          );
        }}
      </QueryState>
    </>
  );
}
