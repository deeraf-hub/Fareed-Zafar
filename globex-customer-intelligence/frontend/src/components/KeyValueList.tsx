import type { ReactNode } from 'react';

export type KeyValueItem = {
  label: ReactNode;
  value: ReactNode;
  title?: string;
};

type Props = {
  items: KeyValueItem[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
};

const COLUMN_CLASSES: Record<NonNullable<Props['columns']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

export function KeyValueList({ items, columns = 2, className = '' }: Props) {
  return (
    <dl className={`grid gap-x-6 gap-y-4 ${COLUMN_CLASSES[columns]} ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="min-w-0" title={item.title}>
          <dt className="text-xs font-medium text-ink-secondary">{item.label}</dt>
          <dd className="mt-0.5 break-words text-base tabular-nums text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
