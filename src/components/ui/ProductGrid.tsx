import { useState } from 'react'
import type { Product } from '@/types'
import { ProductCard } from './ProductCard'
import { QuickViewModal } from './QuickViewModal'
import { Reveal } from './Reveal'

export function ProductGrid({ products, columns = 4 }: { products: Product[]; columns?: 2 | 3 | 4 }) {
  const [quickView, setQuickView] = useState<Product | null>(null)

  const colClass = columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-4'

  return (
    <>
      <div className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 ${colClass}`}>
        {products.map((product, i) => (
          <Reveal key={product.id} delay={(i % 4) * 60}>
            <ProductCard product={product} onQuickView={setQuickView} />
          </Reveal>
        ))}
      </div>
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </>
  )
}
