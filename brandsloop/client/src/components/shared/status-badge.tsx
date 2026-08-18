import { Badge } from '@/components/ui/badge';
import { humanize } from '@/lib/utils';
import type { StockStatus } from '@/types';

const STOCK_VARIANT: Record<StockStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  IN_STOCK: 'success',
  LOW_STOCK: 'warning',
  OUT_OF_STOCK: 'danger',
  OVERSTOCK: 'info',
};

const STOCK_LABEL: Record<StockStatus, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
  OVERSTOCK: 'Overstock',
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return <Badge variant={STOCK_VARIANT[status]}>{STOCK_LABEL[status]}</Badge>;
}

const DOC_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'secondary'> = {
  DRAFT: 'muted',
  ORDERED: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  IN_TRANSIT: 'info',
  IN_PROGRESS: 'info',
  ACTIVE: 'success',
  INACTIVE: 'muted',
  DISCONTINUED: 'danger',
  PAID: 'success',
  PARTIAL: 'warning',
  UNPAID: 'danger',
  RESELLABLE: 'success',
  DAMAGED: 'danger',
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={DOC_VARIANT[status] ?? 'secondary'}>{humanize(status)}</Badge>;
}

const MOVEMENT_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  PURCHASE: 'success',
  SALE: 'info',
  CUSTOMER_RETURN: 'success',
  SUPPLIER_RETURN: 'warning',
  ADJUSTMENT: 'warning',
  TRANSFER_IN: 'success',
  TRANSFER_OUT: 'warning',
  DAMAGED: 'danger',
  LOST: 'danger',
  OPENING_STOCK: 'muted',
  STOCK_COUNT: 'warning',
  SALE_CANCELLED: 'muted',
  PURCHASE_CANCELLED: 'muted',
};

export function MovementBadge({ type }: { type: string }) {
  return <Badge variant={MOVEMENT_VARIANT[type] ?? 'muted'}>{humanize(type)}</Badge>;
}

/** Signed quantity, coloured so a stock increase reads green at a glance. */
export function QuantityDelta({ value }: { value: number }) {
  const positive = value > 0;
  return (
    <span className={positive ? 'font-medium tabular text-emerald-600' : 'font-medium tabular text-red-600'}>
      {positive ? '+' : ''}
      {value.toLocaleString()}
    </span>
  );
}
