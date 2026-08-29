import { Star } from 'lucide-react'

export default function Rating({ value, count, size = 14 }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= Math.round(value)
          return (
            <Star
              key={i}
              size={size}
              className={filled ? 'fill-accent-500 text-accent-500' : 'fill-steel-200 text-steel-200'}
            />
          )
        })}
      </div>
      <span className="text-xs text-steel-500">
        {value.toFixed(1)}
        {typeof count === 'number' ? ` (${count})` : ''}
      </span>
    </div>
  )
}
