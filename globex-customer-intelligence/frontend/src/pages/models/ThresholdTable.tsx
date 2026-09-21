import type { ThresholdRow } from '../../api/types';
import { DataTable, type Column } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { formatNumber, formatPercent } from '../../lib/format';

const COLUMNS: Column<ThresholdRow>[] = [
  { id: 'threshold', header: 'Threshold', align: 'right', render: (row) => formatNumber(row.threshold, 2) },
  { id: 'precision', header: 'Precision', align: 'right', render: (row) => formatPercent(row.precision) },
  { id: 'recall', header: 'Recall', align: 'right', render: (row) => formatPercent(row.recall) },
  { id: 'flagged_share', header: 'Flagged share', align: 'right', render: (row) => formatPercent(row.flagged_share) },
  { id: 'flagged_count', header: 'Flagged customers', align: 'right', render: (row) => formatNumber(row.flagged_count) },
];

export function ThresholdTable({ rows }: { rows: ThresholdRow[] | null }) {
  if (!rows || rows.length === 0) {
    return <EmptyState compact title="No threshold analysis recorded for this run." />;
  }
  return <DataTable columns={COLUMNS} rows={rows} rowKey={(row) => String(row.threshold)} dense caption="Precision and recall at each decision threshold" />;
}
