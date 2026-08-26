import { discountPercent, formatPrice } from '@/lib/format'

interface PriceProps {
  price: number
  compareAtPrice?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
} as const

export function Price({ price, compareAtPrice, size = 'sm', className = '' }: PriceProps) {
  const off = discountPercent(price, compareAtPrice)
  return (
    <span className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`${SIZES[size]} font-medium text-navy-700`}>{formatPrice(price)}</span>
      {compareAtPrice && (
        <span className="text-xs text-stoneish line-through">{formatPrice(compareAtPrice)}</span>
      )}
      {off !== null && (
        <span className="text-[10px] uppercase tracking-wideish text-champagne-600">
          {off}% off
        </span>
      )}
    </span>
  )
}
