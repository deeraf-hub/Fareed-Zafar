import { discountPercent, formatPKR } from '@/lib/currency'

export function Price({ price, compareAtPrice, size = 'md' }: { price: number; compareAtPrice?: number; size?: 'sm' | 'md' | 'lg' }) {
  const discount = discountPercent(price, compareAtPrice)
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`font-medium text-charcoal ${textSize}`}>{formatPKR(price)}</span>
      {compareAtPrice && compareAtPrice > price && (
        <span className="text-sm text-charcoal-muted line-through">{formatPKR(compareAtPrice)}</span>
      )}
      {discount && (
        <span className="text-xs font-medium text-champagne-700 bg-champagne-100 px-1.5 py-0.5">-{discount}%</span>
      )}
    </div>
  )
}
