import type { SegmentProfile } from '../../api/types';
import { DataTable, type Column } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { formatDays, formatGBP, formatNumber, formatPercent } from '../../lib/format';

const COLUMNS: Column<SegmentProfile>[] = [
  {
    id: 'segment',
    header: 'Segment',
    nowrap: true,
    render: (row) => (
      <span>
        <span className="font-medium text-ink">{row.segment_name}</span>
        <span className="block text-xs text-ink-secondary">Cluster {row.cluster_id}</span>
      </span>
    ),
  },
  { id: 'customers', header: 'Customers', align: 'right', render: (row) => formatNumber(row.customers) },
  { id: 'share', header: 'Share', align: 'right', render: (row) => formatPercent(row.share) },
  {
    id: 'median_recency_days',
    header: 'Median recency',
    headerTitle: 'Days since last order at the cutoff (mean in small text)',
    align: 'right',
    nowrap: true,
    render: (row) => (
      <span>
        {formatDays(row.median_recency_days)}
        <span className="block text-xs text-ink-secondary">mean {formatDays(row.avg_recency_days)}</span>
      </span>
    ),
  },
  {
    id: 'median_frequency',
    header: 'Median frequency',
    headerTitle: 'Orders in the lookback window (mean in small text)',
    align: 'right',
    nowrap: true,
    render: (row) => (
      <span>
        {formatNumber(row.median_frequency, 1)}
        <span className="block text-xs text-ink-secondary">mean {formatNumber(row.avg_frequency, 1)}</span>
      </span>
    ),
  },
  {
    id: 'median_monetary',
    header: 'Median monetary',
    headerTitle: 'Net spending in the lookback window (mean in small text)',
    align: 'right',
    nowrap: true,
    render: (row) => (
      <span>
        {formatGBP(row.median_monetary)}
        <span className="block text-xs text-ink-secondary">mean {formatGBP(row.avg_monetary)}</span>
      </span>
    ),
  },
  { id: 'revenue_share', header: 'Revenue share', align: 'right', render: (row) => formatPercent(row.revenue_share) },
  { id: 'description', header: 'Description', className: 'min-w-[16rem] text-sm text-ink-secondary', render: (row) => row.description },
];

export function SegmentProfilesTable({ profiles }: { profiles: SegmentProfile[] }) {
  if (profiles.length === 0) {
    return <EmptyState compact title="No segment profiles recorded." />;
  }
  const sorted = [...profiles].sort((a, b) => b.customers - a.customers);
  return <DataTable columns={COLUMNS} rows={sorted} rowKey={(row) => String(row.cluster_id)} caption="Segment profiles from the active segmentation model" />;
}
