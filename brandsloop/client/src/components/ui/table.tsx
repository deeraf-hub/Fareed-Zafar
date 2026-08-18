import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Wraps a table so it scrolls sideways on narrow screens instead of forcing
 * the page to scroll. Pages that need a card layout on mobile render one
 * directly and hide the table with responsive classes.
 */
export function TableWrapper({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full caption-bottom text-sm">{children}</table>
    </div>
  );
}

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('[&_tr]:border-b bg-muted/40', className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted', className)} {...props} />
);

export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      'h-11 whitespace-nowrap px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground',
      className,
    )}
    {...props}
  />
);

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-3 py-3 align-middle', className)} {...props} />
);

interface SortableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  column: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export function SortableHead({ column, sortBy, sortDir, onSort, children, className, ...props }: SortableHeadProps) {
  const active = sortBy === column;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <TableHead className={cn('p-0', className)} {...props}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'flex h-11 w-full items-center gap-1.5 px-3 text-left text-xs font-semibold uppercase tracking-wide transition-colors hover:text-foreground',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {children}
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </button>
    </TableHead>
  );
}
