import type { ReactNode } from 'react';
import clsx from 'clsx';

export function Field({
  label,
  hint,
  children,
  className,
  inline,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  inline?: boolean;
}) {
  return (
    <label className={clsx('block', inline && 'flex items-center justify-between gap-3', className)}>
      <span className="label block mb-1">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="border-b border-ink-700 px-3 py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">{title}</h3>
        {actions}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
