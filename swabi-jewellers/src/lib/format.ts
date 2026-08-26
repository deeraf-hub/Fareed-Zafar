import { siteConfig } from '@/config/site'

const numberFormat = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })

/** Rs. 18,500 — the only place prices are formatted. */
export function formatPrice(amount: number): string {
  return `${siteConfig.commerce.currencySymbol} ${numberFormat.format(Math.round(amount))}`
}

export function discountPercent(price: number, compareAtPrice?: number): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function deliveryFeeFor(subtotal: number): number {
  if (subtotal <= 0) return 0
  return subtotal >= siteConfig.commerce.freeDeliveryThreshold ? 0 : siteConfig.commerce.deliveryFee
}
