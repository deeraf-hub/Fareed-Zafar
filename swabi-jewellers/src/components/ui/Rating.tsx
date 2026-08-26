import { StarIcon } from './icons'

interface RatingProps {
  value: number
  count?: number
  size?: 'sm' | 'md'
  className?: string
  showValue?: boolean
}

export function Rating({ value, count, size = 'sm', className = '', showValue }: RatingProps) {
  const dimension = size === 'md' ? 16 : 13
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <span className="flex text-champagne-500" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <StarIcon
            key={index}
            width={dimension}
            height={dimension}
            fillLevel={Math.max(0, Math.min(1, value - index))}
          />
        ))}
      </span>
      <span className="sr-only">{`Rated ${value} out of 5`}</span>
      {showValue && <span className="text-xs text-stoneish">{value.toFixed(1)}</span>}
      {typeof count === 'number' && (
        <span className="text-xs text-stoneish">
          ({count}
          {size === 'md' ? ' reviews' : ''})
        </span>
      )}
    </span>
  )
}
