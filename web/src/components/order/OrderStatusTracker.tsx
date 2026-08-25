import { Check, CircleX } from 'lucide-react';
import type { OrderStatus } from '../../types';

const steps: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Order Received' },
  { status: 'processing', label: 'Processing' },
  { status: 'packed', label: 'Packed' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'delivered', label: 'Delivered' },
];

/** Confirmed sits between received and processing on the customer-facing view. */
const indexFor = (status: OrderStatus): number => {
  if (status === 'confirmed') return 0;
  const index = steps.findIndex((step) => step.status === status);
  return index === -1 ? 0 : index;
};

export const OrderStatusTracker = ({ status }: { status: OrderStatus }) => {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-200 text-ink-700">
          <CircleX className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900">Order cancelled</p>
          <p className="text-xs text-ink-500">Call the shop if you would like to place it again.</p>
        </div>
      </div>
    );
  }

  const current = indexFor(status);

  return (
    <ol className="grid gap-4 sm:grid-cols-5" aria-label="Order progress">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.status} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                done
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : active
                    ? 'border-brand-600 bg-white text-brand-600'
                    : 'border-ink-200 bg-white text-ink-400'
              }`}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
            <span className="sm:w-full">
              <span
                className={`block text-sm font-medium ${done || active ? 'text-ink-900' : 'text-ink-400'}`}
              >
                {step.label}
              </span>
              {active && <span className="text-xs text-brand-600">Current status</span>}
            </span>
            <span
              className={`hidden h-1 w-full rounded-full sm:block ${done || active ? 'bg-brand-600' : 'bg-ink-200'}`}
              aria-hidden="true"
            />
          </li>
        );
      })}
    </ol>
  );
};
