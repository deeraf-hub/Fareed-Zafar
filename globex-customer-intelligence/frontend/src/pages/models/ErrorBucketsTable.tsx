import type { ErrorBucket } from '../../api/types';
import { DataTable, type Column } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { formatGBP, formatMetric, formatNumber, formatPercent } from '../../lib/format';

type Props = {
  rows: ErrorBucket[] | null;
  /** How to display error and mean values: money for the spend model, plain metrics otherwise. */
  valueFormat: 'gbp' | 'metric';
};

type NumericField = 'mae' | 'rmse' | 'precision' | 'recall' | 'mean_actual' | 'mean_predicted';

const FIELD_ORDER: { field: NumericField; header: string; kind: 'value' | 'rate' }[] = [
  { field: 'mae', header: 'MAE', kind: 'value' },
  { field: 'rmse', header: 'RMSE', kind: 'value' },
  { field: 'precision', header: 'Precision', kind: 'rate' },
  { field: 'recall', header: 'Recall', kind: 'rate' },
  { field: 'mean_actual', header: 'Mean actual', kind: 'value' },
  { field: 'mean_predicted', header: 'Mean predicted', kind: 'value' },
];

export function ErrorBucketsTable({ rows, valueFormat }: Props) {
  if (!rows || rows.length === 0) {
    return <EmptyState compact title="No error analysis recorded for this run." />;
  }
  const formatValue = valueFormat === 'gbp' ? formatGBP : formatMetric;
  const presentFields = FIELD_ORDER.filter(({ field }) => rows.some((row) => row[field] !== null));

  const columns: Column<ErrorBucket>[] = [
    { id: 'bucket', header: 'Bucket', render: (row) => row.bucket },
    { id: 'count', header: 'Count', align: 'right', render: (row) => formatNumber(row.count) },
    ...presentFields.map<Column<ErrorBucket>>(({ field, header, kind }) => ({
      id: field,
      header,
      align: 'right',
      nowrap: true,
      render: (row) => (kind === 'rate' ? formatPercent(row[field]) : formatValue(row[field])),
    })),
  ];

  return <DataTable columns={columns} rows={rows} rowKey={(row) => row.bucket} dense caption="Error analysis by bucket" />;
}
