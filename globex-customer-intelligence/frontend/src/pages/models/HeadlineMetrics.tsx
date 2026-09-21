import type { MetricEntry } from '../../api/types';
import { EmptyState } from '../../components/EmptyState';
import { formatMetric, humanize } from '../../lib/format';

export function HeadlineMetrics({ metrics }: { metrics: MetricEntry[] }) {
  if (metrics.length === 0) {
    return <EmptyState compact title="No headline metrics recorded for this run." />;
  }
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => {
        const hasCi = metric.ci_low !== null && metric.ci_high !== null;
        return (
          <div key={metric.name} className="rounded-md border border-line bg-page px-3 py-2" title={metric.name}>
            <dt className="text-xs font-medium text-ink-secondary">{metric.label || humanize(metric.name)}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{formatMetric(metric.value)}</dd>
            {hasCi && (
              <dd className="text-xs tabular-nums text-ink-secondary">
                CI {formatMetric(metric.ci_low)} &ndash; {formatMetric(metric.ci_high)}
              </dd>
            )}
            {metric.higher_is_better !== null && (
              <dd className="text-xs text-ink-secondary">{metric.higher_is_better ? 'Higher is better' : 'Lower is better'}</dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
