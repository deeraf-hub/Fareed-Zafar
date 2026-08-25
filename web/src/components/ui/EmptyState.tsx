import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
  /** Use h1 when the empty state is the page's main heading (404, not found). */
  as?: 'h1' | 'h2';
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  as: Heading = 'h2',
}: EmptyStateProps) => (
  <div className="card flex flex-col items-center px-6 py-14 text-center">
    <span
      className={`mb-4 flex size-14 items-center justify-center rounded-full ${
        tone === 'error' ? 'bg-brand-50 text-brand-600' : 'bg-ink-100 text-ink-500'
      }`}
    >
      <Icon className="size-7" aria-hidden="true" />
    </span>
    <Heading className="text-lg font-semibold text-ink-900">{title}</Heading>
    <p className="mt-2 max-w-md text-sm text-ink-500">{description}</p>
    {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
  </div>
);
