import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, meta, actions }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-sm text-ink-secondary">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-base text-ink-secondary">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
