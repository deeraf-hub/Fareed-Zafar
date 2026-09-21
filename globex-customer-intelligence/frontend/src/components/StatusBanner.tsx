import type { ReactNode } from 'react';

type Props = {
  tone?: 'info' | 'caution';
  badge?: string;
  children: ReactNode;
  className?: string;
};

const TONE_CLASSES = {
  info: 'border-b border-line bg-accent-soft text-ink',
  caution: 'border-l-4 border-caution bg-caution-soft text-ink',
};

const BADGE_CLASSES = {
  info: 'bg-accent text-white',
  caution: 'bg-caution text-white',
};

export function StatusBanner({ tone = 'info', badge, children, className = '' }: Props) {
  return (
    <div role="note" className={`${TONE_CLASSES[tone]} ${className}`}>
      <div className="container flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
        {badge && (
          <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${BADGE_CLASSES[tone]}`}>
            {badge}
          </span>
        )}
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}
