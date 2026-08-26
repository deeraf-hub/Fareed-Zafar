/** Formats a number as Pakistani Rupees, e.g. 3500 → "PKR 3,500". */
export const formatPKR = (value: number): string => `PKR ${Math.round(value).toLocaleString('en-PK')}`;

/** Short display date, e.g. "12 Mar 2026". */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

/** Date with time, used on order records. */
export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const discountPercent = (price: number, oldPrice: number | null): number | null => {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
};
