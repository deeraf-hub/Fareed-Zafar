import type { ModelComparisonRow } from '../../api/types';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { useOverflowHint } from '../../hooks/useOverflowHint';
import { formatMetric } from '../../lib/format';
import { metricLabel } from '../../lib/labels';

type Props = {
  rows: ModelComparisonRow[];
};

function metricKeys(rows: ModelComparisonRow[]): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    for (const key of [...Object.keys(row.validation_metrics), ...Object.keys(row.test_metrics ?? {})]) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

const HEAD_CLASS = 'whitespace-nowrap border-b border-line px-3 py-2 text-xs font-medium text-ink-secondary';
const CELL_CLASS = 'whitespace-nowrap px-3 py-2 text-right tabular-nums';

export function ComparisonTable({ rows }: Props) {
  const keys = metricKeys(rows);
  const hasTest = rows.some((row) => row.test_metrics !== null);
  const { ref, overflowing } = useOverflowHint(`${rows.length}:${keys.length}:${hasTest}`);
  if (rows.length === 0) {
    return <EmptyState compact title="No comparison recorded for this run." />;
  }

  return (
    <div>
      {overflowing && (
        <p className="mb-2 text-xs text-ink-secondary" aria-hidden="true">
          Scroll horizontally to see all columns &rarr;
        </p>
      )}
      <div ref={ref} className="relative overflow-x-auto rounded-md border border-line" tabIndex={overflowing ? 0 : undefined}>
        <table className="min-w-full border-collapse text-base">
          <caption className="sr-only">Baseline and candidate models with validation and test metrics</caption>
          <thead className="bg-page">
            <tr>
              <th scope="col" rowSpan={2} className={`${HEAD_CLASS} text-left align-bottom`}>
                Model
              </th>
              <th scope="col" rowSpan={2} className={`${HEAD_CLASS} text-left align-bottom`}>
                Algorithm
              </th>
              <th scope="colgroup" colSpan={keys.length} className={`${HEAD_CLASS} text-center`}>
                Validation
              </th>
              {hasTest && (
                <th scope="colgroup" colSpan={keys.length} className={`${HEAD_CLASS} border-l border-line text-center`}>
                  Test
                </th>
              )}
            </tr>
            <tr>
              {keys.map((key) => (
                <th key={`val-${key}`} scope="col" className={`${HEAD_CLASS} text-right`} title={key}>
                  {metricLabel(key)}
                </th>
              ))}
              {hasTest &&
                keys.map((key, index) => (
                  <th key={`test-${key}`} scope="col" className={`${HEAD_CLASS} text-right ${index === 0 ? 'border-l border-line' : ''}`} title={key}>
                    {metricLabel(key)}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.model_name}
                className={`border-b border-line last:border-b-0 ${row.is_selected ? 'bg-accent-soft' : ''}`}
              >
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-ink">
                  <span className="flex flex-wrap items-center gap-2">
                    {row.model_name}
                    {row.is_baseline && <Badge tone="neutral">Baseline</Badge>}
                    {row.is_selected && <Badge tone="accent">Selected</Badge>}
                  </span>
                </th>
                <td className="whitespace-nowrap px-3 py-2 text-ink-secondary">{row.algorithm}</td>
                {keys.map((key) => (
                  <td key={`val-${key}`} className={CELL_CLASS}>
                    {formatMetric(row.validation_metrics[key] ?? null)}
                  </td>
                ))}
                {hasTest &&
                  keys.map((key, index) => (
                    <td key={`test-${key}`} className={`${CELL_CLASS} ${index === 0 ? 'border-l border-line' : ''}`}>
                      {formatMetric(row.test_metrics?.[key] ?? null)}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
