import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

export function EmptyState({ title, description, action, compact = false }: Props) {
  return (
    <div className={`rounded-lg border border-dashed border-line bg-page text-center ${compact ? 'px-4 py-6' : 'px-6 py-12'}`}>
      <p className="text-base font-medium text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-secondary">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
