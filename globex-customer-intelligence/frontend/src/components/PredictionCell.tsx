import type { PredictionValue } from '../api/types';
import { formatDate, formatGBP, formatPercent } from '../lib/format';

type Props = {
  prediction: PredictionValue;
  kind: 'probability' | 'gbp';
  /** Show "As of {cutoff} · model {version}" under the value. */
  showMeta?: boolean;
  className?: string;
};

export const DEFAULT_UNAVAILABLE_REASON = 'No prediction is available for this customer.';

export function formatPredictionValue(prediction: PredictionValue, kind: Props['kind']): string {
  if (prediction.status !== 'available' || prediction.value === null) return 'Unavailable';
  return kind === 'probability' ? formatPercent(prediction.value) : formatGBP(prediction.value);
}

export function PredictionCell({ prediction, kind, showMeta = false, className = '' }: Props) {
  if (prediction.status !== 'available' || prediction.value === null) {
    const reason = prediction.reason?.trim() || DEFAULT_UNAVAILABLE_REASON;
    return (
      <span className={`text-ink-secondary ${className}`} title={reason} data-testid="prediction-unavailable">
        Unavailable
        <span className="sr-only">: {reason}</span>
      </span>
    );
  }
  const value = formatPredictionValue(prediction, kind);
  return (
    <span className={className}>
      <span className="tabular-nums">{value}</span>
      {showMeta && (
        <span className="mt-0.5 block text-xs text-ink-secondary">
          As of {formatDate(prediction.cutoff_date)} &middot; model {prediction.model_version ?? 'unknown'}
        </span>
      )}
    </span>
  );
}
