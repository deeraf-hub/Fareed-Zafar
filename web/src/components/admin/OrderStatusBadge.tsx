import type { OrderStatus } from '../../types';

const styles: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  processing: 'bg-indigo-100 text-indigo-800',
  packed: 'bg-violet-100 text-violet-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-ink-200 text-ink-700',
};

export const orderStatuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
];

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className={`badge capitalize ${styles[status]}`}>{status}</span>
);
