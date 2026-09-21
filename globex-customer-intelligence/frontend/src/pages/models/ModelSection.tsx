import type { ReactNode } from 'react';
import type { ModelRunSummary } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { KeyValueList } from '../../components/KeyValueList';
import { EM_DASH, formatDate, formatDateTime, formatNumber, formatPeriod } from '../../lib/format';
import { ComparisonTable } from './ComparisonTable';
import { HeadlineMetrics } from './HeadlineMetrics';

type Props = {
  id: string;
  title: string;
  subtitle: string;
  run: ModelRunSummary | null;
  /** Model-type-specific diagnostics rendered between the comparison and the limitations. */
  children?: (run: ModelRunSummary) => ReactNode;
};

function Mono({ value }: { value: string | null }) {
  return value ? <span className="font-mono text-xs">{value}</span> : <>{EM_DASH}</>;
}

function JsonDetails({ summary, value }: { summary: string; value: Record<string, unknown> }) {
  const entries = Object.entries(value);
  if (entries.length === 0) return null;
  return (
    <details className="rounded-md border border-line bg-page">
      <summary className="focus-ring cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-ink">
        {summary} ({formatNumber(entries.length)})
      </summary>
      <pre className="overflow-x-auto border-t border-line px-4 py-3 font-mono text-xs leading-5 text-ink">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export function ModelSection({ id, title, subtitle, run, children }: Props) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={headingId} className="text-xl font-semibold text-ink">
          {title}
        </h2>
        <p className="text-sm text-ink-secondary">{subtitle}</p>
      </div>

      {run === null ? (
        <EmptyState
          title="No trained model."
          description={
            <>
              Run <code className="rounded-sm bg-page px-1 font-mono text-xs">gci train</code> (see README).
            </>
          }
        />
      ) : (
        <>
          <Card
            title="Run summary"
            headingLevel={3}
            actions={<Badge tone={run.is_active ? 'accent' : 'neutral'}>{run.is_active ? 'Active model' : 'Inactive model'}</Badge>}
          >
            <KeyValueList
              columns={4}
              items={[
                { label: 'Model version', value: <Mono value={run.model_version} /> },
                { label: 'Algorithm', value: run.algorithm },
                { label: 'Status', value: run.status },
                { label: 'Trained at', value: formatDateTime(run.trained_at) },
                { label: 'Data cutoff', value: formatDate(run.data_cutoff) },
                { label: 'Scoring cutoff', value: formatDate(run.scoring_cutoff) },
                { label: 'Train period', value: formatPeriod(run.train_period) },
                { label: 'Validation period', value: formatPeriod(run.validation_period) },
                { label: 'Test period', value: formatPeriod(run.test_period) },
                { label: 'Training rows', value: formatNumber(run.n_train) },
                { label: 'Validation rows', value: formatNumber(run.n_validation) },
                { label: 'Test rows', value: formatNumber(run.n_test) },
                { label: 'Data version', value: <Mono value={run.data_version} /> },
                { label: 'Code version', value: <Mono value={run.code_version} /> },
                { label: 'MLflow run', value: <Mono value={run.mlflow_run_id} /> },
                { label: 'Features', value: formatNumber(run.feature_names.length) },
              ]}
            />
            {run.feature_names.length > 0 && (
              <details className="mt-4">
                <summary className="focus-ring cursor-pointer rounded-sm text-sm font-medium text-accent">
                  Feature names ({formatNumber(run.feature_names.length)})
                </summary>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {run.feature_names.map((name) => (
                    <li key={name} className="rounded-sm border border-line bg-page px-1.5 py-0.5 font-mono text-xs text-ink">
                      {name}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>

          <Card title="Headline metrics" headingLevel={3} description="Values reported for the selected model on held-out data.">
            <HeadlineMetrics metrics={run.headline_metrics} />
          </Card>

          <Card
            title="Baseline vs selected model"
            headingLevel={3}
            description="Every candidate with its validation and test metrics. The selected model is highlighted; a baseline that scores better is shown as-is."
          >
            <ComparisonTable rows={run.comparison} />
          </Card>

          {children?.(run)}

          <Card title="Limitations" headingLevel={3}>
            {run.limitations.length === 0 ? (
              <p className="text-sm text-ink-secondary">No limitations recorded for this run.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
                {run.limitations.map((limitation, index) => (
                  <li key={index}>{limitation}</li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <JsonDetails summary="Parameters" value={run.params} />
            <JsonDetails summary="All recorded metrics" value={run.metrics} />
          </div>
        </>
      )}
    </section>
  );
}
