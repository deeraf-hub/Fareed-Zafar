import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { useModels } from '../../hooks/queries';
import { PREDICTION_LABELS } from '../../lib/labels';
import { CalibrationChart } from './CalibrationChart';
import { ErrorBucketsTable } from './ErrorBucketsTable';
import { ModelSection } from './ModelSection';
import { SegmentProfilesTable } from './SegmentProfilesTable';
import { ThresholdTable } from './ThresholdTable';

const SECTIONS = [
  { id: 'classification', label: 'Classification' },
  { id: 'regression', label: 'Regression' },
  { id: 'segmentation', label: 'Segmentation' },
];

export function ModelPerformancePage() {
  const query = useModels();
  return (
    <>
      <PageHeader
        title="Model Performance"
        description="Training runs, held-out metrics, baselines and known limitations for the active models."
        meta={
          <nav aria-label="Model sections" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="link">
                {section.label}
              </a>
            ))}
          </nav>
        }
      />
      <QueryState query={query} loadingText="Loading model runs…" errorTitle="Could not load model runs">
        {(models) => (
          <div className="space-y-10">
            <ModelSection
              id="classification"
              title="Classification"
              subtitle={PREDICTION_LABELS.repeat_purchase_probability}
              run={models.classification}
            >
              {(run) => (
                <>
                  <Card
                    title="Calibration"
                    headingLevel={3}
                    description="How well predicted probabilities match observed repeat-purchase rates on held-out data."
                  >
                    <CalibrationChart bins={run.calibration} />
                  </Card>
                  <Card
                    title="Threshold trade-off"
                    headingLevel={3}
                    description="Precision, recall and the share of customers flagged at each decision threshold."
                  >
                    <ThresholdTable rows={run.thresholds} />
                  </Card>
                  <Card title="Error analysis" headingLevel={3} description="Performance across customer buckets on held-out data.">
                    <ErrorBucketsTable rows={run.error_analysis} valueFormat="metric" />
                  </Card>
                </>
              )}
            </ModelSection>

            <ModelSection id="regression" title="Regression" subtitle={PREDICTION_LABELS.predicted_spend_30d} run={models.regression}>
              {(run) => (
                <Card title="Error analysis" headingLevel={3} description="Absolute and squared errors (GBP) across customer buckets on held-out data.">
                  <ErrorBucketsTable rows={run.error_analysis} valueFormat="gbp" />
                </Card>
              )}
            </ModelSection>

            <ModelSection id="segmentation" title="Segmentation" subtitle="Customer segments from RFM clustering" run={models.segmentation}>
              {() => (
                <Card title="Segment profiles" headingLevel={3} description="Size and typical recency, frequency and monetary value of each segment.">
                  <SegmentProfilesTable profiles={models.segment_profiles} />
                </Card>
              )}
            </ModelSection>
          </div>
        )}
      </QueryState>
    </>
  );
}
