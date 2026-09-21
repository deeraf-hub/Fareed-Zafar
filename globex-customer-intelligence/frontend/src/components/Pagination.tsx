import { formatNumber } from '../lib/format';
import { Button } from './Button';
import { Select } from './Select';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  itemLabel?: string;
  idPrefix?: string;
};

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  itemLabel = 'rows',
  idPrefix = 'pagination',
}: Props) {
  const lastPage = Math.max(totalPages, 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <p className="text-sm text-ink-secondary" aria-live="polite">
        Showing {formatNumber(from)}&ndash;{formatNumber(to)} of {formatNumber(total)} {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <Select
            id={`${idPrefix}-page-size`}
            label="Rows per page"
            inline
            value={String(pageSize)}
            options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
            onChange={(value) => onPageSizeChange(Number(value))}
          />
        )}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-ink-secondary">
            Page {formatNumber(page)} of {formatNumber(lastPage)}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </nav>
  );
}
