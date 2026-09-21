import { describeError } from '../lib/errors';
import { Button } from './Button';

type Props = {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
};

export function ErrorState({ error, onRetry, title, compact = false }: Props) {
  const described = describeError(error, title);
  return (
    <div
      role="alert"
      className={`rounded-lg border border-caution/40 bg-surface ${compact ? 'px-4 py-4' : 'px-6 py-8'}`}
    >
      <p className="text-base font-semibold text-ink">{described.title}</p>
      <p className="mt-1 text-sm text-ink-secondary">{described.message}</p>
      {described.code && (
        <p className="mt-1 font-mono text-xs text-ink-secondary">
          {described.code}
          {described.status ? ` · HTTP ${described.status}` : ''}
        </p>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
