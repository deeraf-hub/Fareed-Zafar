type Props = {
  text?: string;
  rows?: number;
  compact?: boolean;
};

/** Static skeleton (no animation) with a live status message for assistive technology. */
export function LoadingState({ text = 'Loading…', rows = 4, compact = false }: Props) {
  return (
    <div role="status" aria-live="polite" className={`card ${compact ? 'p-4' : 'p-6'}`}>
      <p className="text-sm text-ink-secondary">{text}</p>
      <div className="mt-4 space-y-3" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="h-4 rounded-sm bg-line" style={{ width: `${88 - (index % 3) * 14}%` }} />
        ))}
      </div>
    </div>
  );
}
