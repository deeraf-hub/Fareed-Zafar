import type { StockStatus } from '@/types';

/**
 * Coarse status for displays that only know the quantity (e.g. the scan page,
 * where thresholds are not part of the lookup payload).
 */
export function stockStatusFor(quantity: number, threshold = 0): StockStatus {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (threshold > 0 && quantity <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}
