import type { ReactNode } from 'react';
import type { SortOrder } from '../api/types';
import { useOverflowHint } from '../hooks/useOverflowHint';

export type SortState<K extends string> = { key: K; order: SortOrder };

export type Column<T, K extends string = string> = {
  id: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  /** When set, the header becomes a sort button and reports `aria-sort`. */
  sortKey?: K;
  align?: 'left' | 'right' | 'center';
  /** One-line definition shown on hover of the header. */
  headerTitle?: string;
  className?: string;
  nowrap?: boolean;
};

type Props<T, K extends string> = {
  columns: Column<T, K>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  sort?: SortState<K>;
  onSort?: (key: K) => void;
  caption?: ReactNode;
  captionHidden?: boolean;
  emptyMessage?: ReactNode;
  busy?: boolean;
  dense?: boolean;
  rowClassName?: (row: T, index: number) => string;
};

const ALIGN_CLASSES = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

function SortIcon({ order }: { order: SortOrder | null }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 16" width="10" height="14" className="shrink-0">
      <path d="M6 2 L10 6 L2 6 Z" fill={order === 'asc' ? '#1D4ED8' : '#C4CAD4'} />
      <path d="M6 14 L2 10 L10 10 Z" fill={order === 'desc' ? '#1D4ED8' : '#C4CAD4'} />
    </svg>
  );
}

export function DataTable<T, K extends string = string>({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  caption,
  captionHidden = true,
  emptyMessage = 'No rows to show.',
  busy = false,
  dense = false,
  rowClassName,
}: Props<T, K>) {
  const { ref, overflowing } = useOverflowHint(`${rows.length}:${columns.length}`);
  const cellPadding = dense ? 'px-3 py-1.5' : 'px-3 py-2.5';

  return (
    <div className="min-w-0 max-w-full">
      {overflowing && (
        <p className="mb-2 text-xs text-ink-secondary" aria-hidden="true">
          Scroll horizontally to see all columns &rarr;
        </p>
      )}
      <div ref={ref} className="relative overflow-x-auto rounded-md border border-line" tabIndex={overflowing ? 0 : undefined}>
        <table className="min-w-full border-collapse text-base" aria-busy={busy || undefined}>
          {caption && <caption className={captionHidden ? 'sr-only' : 'px-3 py-2 text-left text-sm text-ink-secondary'}>{caption}</caption>}
          <thead className="bg-page">
            <tr>
              {columns.map((column) => {
                const sortKey = column.sortKey;
                const isActive = sortKey !== undefined && sort?.key === sortKey;
                const ariaSort = sortKey
                  ? isActive
                    ? sort?.order === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                  : undefined;
                const alignClass = ALIGN_CLASSES[column.align ?? 'left'];
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`${cellPadding} border-b border-line text-xs font-medium text-ink-secondary ${alignClass} ${column.nowrap ? 'whitespace-nowrap' : ''}`}
                  >
                    {sortKey && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(sortKey)}
                        title={column.headerTitle}
                        className={`focus-ring inline-flex max-w-full items-center gap-1 rounded-sm text-left transition-colors duration-150 hover:text-ink ${isActive ? 'text-ink' : ''}`}
                      >
                        <span>{column.header}</span>
                        <SortIcon order={isActive ? (sort?.order ?? null) : null} />
                        <span className="sr-only">
                          {isActive ? (sort?.order === 'asc' ? ', sorted ascending' : ', sorted descending') : ', sortable'}
                        </span>
                      </button>
                    ) : (
                      <span title={column.headerTitle}>{column.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={busy ? 'opacity-60' : ''}>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-ink-secondary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  className={`border-b border-line last:border-b-0 hover:bg-page ${rowClassName ? rowClassName(row, index) : ''}`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={`${cellPadding} align-top ${ALIGN_CLASSES[column.align ?? 'left']} ${column.nowrap ? 'whitespace-nowrap' : ''} ${column.className ?? ''}`}
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
