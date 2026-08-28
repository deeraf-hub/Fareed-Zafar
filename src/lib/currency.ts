import { siteConfig } from '@/config/site'

export function formatPKR(amount: number): string {
  return `${siteConfig.currencySymbol} ${Math.round(amount).toLocaleString('en-PK')}`
}

export function discountPercent(price: number, compareAt?: number): number | null {
  if (!compareAt || compareAt <= price) return null
  return Math.round(((compareAt - price) / compareAt) * 100)
}
