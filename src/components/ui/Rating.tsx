import { StarIcon } from './Icons'

export function Rating({ value, reviewCount, size = 14 }: { value: number; reviewCount?: number; size?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5 text-champagne-600">
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} width={size} height={size} filled={n <= Math.round(value)} />
        ))}
      </div>
      <span className="text-xs text-charcoal-muted">
        {value.toFixed(1)}
        {typeof reviewCount === 'number' && ` (${reviewCount})`}
      </span>
    </div>
  )
}
