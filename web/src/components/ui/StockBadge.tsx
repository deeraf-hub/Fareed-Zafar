import { CheckCircle2, CircleAlert, CircleX } from 'lucide-react';
import { siteConfig } from '../../config/site';

/**
 * Stock status never relies on colour alone — every state carries an icon and
 * a written label.
 */
export const StockBadge = ({ stock, quantity }: { stock: boolean; quantity: number }) => {
  if (!stock) {
    return (
      <span className="badge bg-ink-100 text-ink-600">
        <CircleX className="size-3.5" aria-hidden="true" /> Out of stock
      </span>
    );
  }
  if (quantity <= siteConfig.lowStockThreshold) {
    return (
      <span className="badge bg-amber-100 text-amber-800">
        <CircleAlert className="size-3.5" aria-hidden="true" /> Only {quantity} left
      </span>
    );
  }
  return (
    <span className="badge bg-emerald-100 text-emerald-800">
      <CheckCircle2 className="size-3.5" aria-hidden="true" /> In stock
    </span>
  );
};
