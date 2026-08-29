import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { getProductImage } from '../../data/images.js'
import { CATEGORY_MAP } from '../../data/categories.js'
import { formatPKR } from '../../lib/format.js'
import { useCart } from '../../context/CartContext.jsx'
import Rating from '../common/Rating.jsx'
import Badge from '../common/Badge.jsx'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const category = CATEGORY_MAP[product.category]

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-steel-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/product/${product.id}`} className="relative block aspect-square overflow-hidden bg-steel-50">
        <Badge label={product.badge} />
        <img
          src={getProductImage(product, 600)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-600">
          {category?.name}
        </span>
        <Link to={`/product/${product.id}`}>
          <h3 className="line-clamp-2 font-heading text-sm font-semibold text-navy-900 hover:text-accent-600 md:text-base">
            {product.name}
          </h3>
        </Link>
        <p className="line-clamp-2 text-xs text-steel-500 md:text-sm">{product.shortDescription}</p>
        <Rating value={product.rating} count={product.reviewCount} />
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-heading text-base font-bold text-navy-900 md:text-lg">
            {formatPKR(product.price)}
          </span>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => addItem(product, 1)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-600 md:text-sm"
          >
            <ShoppingCart size={15} />
            Add to Cart
          </button>
          <Link
            to={`/product/${product.id}`}
            className="flex items-center justify-center rounded-md border border-navy-800 px-3 py-2 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-800 hover:text-white md:text-sm"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  )
}
