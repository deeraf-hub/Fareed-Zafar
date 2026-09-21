import type { ReactNode } from 'react';

type TileProps = {
  label: string;
  value: string;
  /** Short visible helper text under the value. */
  helper?: string;
  /** One-line definition shown on hover and read by assistive technology. */
  definition?: string;
  className?: string;
};

export function KpiTile({ label, value, helper, definition, className = '' }: TileProps) {
  return (
    <div className={`card p-4 ${className}`} title={definition}>
      <dt className="text-sm text-ink-secondary">
        {label}
        {definition && <span className="sr-only">. {definition}</span>}
      </dt>
      <dd className="mt-1">
        <span className="block text-2xl font-semibold tabular-nums text-ink">{value}</span>
        {helper && <span className="mt-1 block text-xs text-ink-secondary">{helper}</span>}
      </dd>
    </div>
  );
}

export function KpiGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <dl className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${className}`}>{children}</dl>;
}
