import type { Product } from '@/types'
import { Reveal } from '@/components/ui/Reveal'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: Product[]
  showRating?: boolean
  columns?: 3 | 4
  className?: string
  prioritiseFirst?: boolean
}

/** 2 columns on mobile, 3 on tablet, 3–4 on desktop — as specified for the shop grid. */
export function ProductGrid({
  products,
  showRating,
  columns = 4,
  className = '',
  prioritiseFirst = false,
}: ProductGridProps) {
  return (
    <div
      className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:gap-x-8 ${
        columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
      } ${className}`}
    >
      {products.map((product, index) => (
        <Reveal key={product.id} delay={Math.min(index, 7) * 60} className="h-full">
          <ProductCard
            product={product}
            showRating={showRating}
            priority={prioritiseFirst && index < 4}
          />
        </Reveal>
      ))}
    </div>
  )
}
