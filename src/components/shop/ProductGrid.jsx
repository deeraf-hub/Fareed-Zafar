import { PackageSearch } from 'lucide-react'
import ProductCard from './ProductCard.jsx'

export default function ProductGrid({ products }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-steel-200 bg-white px-6 py-20 text-center">
        <PackageSearch size={40} className="text-steel-300" />
        <h3 className="font-heading text-lg font-semibold text-navy-900">No products found</h3>
        <p className="max-w-sm text-sm text-steel-500">
          Try adjusting your search, category or price filters to find what you&apos;re looking for.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
