import { siteConfig } from '../../config/site';
import { formatPKR } from '../../lib/format';
import type { ReactNode } from 'react';

interface OrderSummaryProps {
  subtotal: number;
  deliveryFee: number;
  total: number;
  children?: ReactNode;
  note?: string;
}

export const OrderSummary = ({ subtotal, deliveryFee, total, children, note }: OrderSummaryProps) => (
  <div className="card p-5">
    <h2 className="text-base font-semibold text-ink-900">Order summary</h2>
    <dl className="mt-4 space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-500">Subtotal</dt>
        <dd className="font-medium text-ink-900">{formatPKR(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-500">Delivery</dt>
        <dd className="font-medium text-ink-900">{deliveryFee === 0 ? 'Free' : formatPKR(deliveryFee)}</dd>
      </div>
      <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
        <dt className="font-semibold text-ink-900">Total</dt>
        <dd className="font-bold text-ink-900">{formatPKR(total)}</dd>
      </div>
    </dl>

    {deliveryFee > 0 && (
      <p className="mt-3 text-xs text-ink-500">
        Add {formatPKR(siteConfig.freeDeliveryOver - subtotal)} more for free delivery.
      </p>
    )}
    {note && <p className="mt-3 text-xs text-ink-500">{note}</p>}
    {children && <div className="mt-5 space-y-2">{children}</div>}
  </div>
);
