import type { ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'caution' | 'navy';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-page text-ink-secondary border border-line',
  accent: 'bg-accent-soft text-accent',
  caution: 'bg-caution-soft text-caution',
  navy: 'bg-ink text-white',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </span>
  );
}
