import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { Product } from '@/types'
import { PlaceholderArt } from '@/lib/placeholderArt'
import { Price } from './Price'
import { Rating } from './Rating'
import { HeartIcon, BagIcon, EyeIcon } from './Icons'
import { useWishlist } from '@/context/WishlistContext'
import { useCart } from '@/context/CartContext'

export function ProductCard({
  product,
  onQuickView,
}: {
  product: Product
  onQuickView?: (product: Product) => void
}) {
  const { toggle, isWishlisted } = useWishlist()
  const { addItem } = useCart()
  const [justAdded, setJustAdded] = useState(false)
  const discountBadge = product.compareAtPrice && product.compareAtPrice > product.price

  const handleAddToCart = () => {
    addItem(product.id, 1)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1600)
  }

  return (
    <div className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-ivory-soft">
        <Link to={`/product/${product.slug}`} aria-label={product.name}>
          <PlaceholderArt
            scene={product.images[0]}
            className="h-full w-full transition-transform duration-700 ease-luxe group-hover:scale-[1.06]"
          />
          {product.images[1] && (
            <PlaceholderArt
              scene={product.images[1]}
              className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 ease-luxe group-hover:opacity-100"
            />
          )}
        </Link>

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isNew && (
            <span className="bg-charcoal text-ivory text-[10px] uppercase tracking-widest2 px-2.5 py-1">New</span>
          )}
          {discountBadge && (
            <span className="bg-champagne-600 text-charcoal text-[10px] uppercase tracking-widest2 px-2.5 py-1">Sale</span>
          )}
          {!product.inStock && (
            <span className="bg-ivory text-charcoal-muted text-[10px] uppercase tracking-widest2 px-2.5 py-1 border border-beige-dark">
              Sold Out
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggle(product.id)}
          aria-label={isWishlisted(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted(product.id)}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-ivory/90 text-charcoal transition-colors hover:text-champagne-700"
        >
          <HeartIcon filled={isWishlisted(product.id)} className={isWishlisted(product.id) ? 'text-champagne-600' : ''} />
        </button>

        <div className="absolute inset-x-0 bottom-0 flex translate-y-full gap-2 p-3 transition-transform duration-400 ease-luxe group-hover:translate-y-0">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="flex flex-1 items-center justify-center gap-1.5 bg-ivory/95 py-2.5 text-[11px] uppercase tracking-widest2 text-charcoal transition-colors hover:bg-champagne-100"
            >
              <EyeIcon width={15} height={15} /> Quick View
            </button>
          )}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className="flex flex-1 items-center justify-center gap-1.5 bg-charcoal py-2.5 text-[11px] uppercase tracking-widest2 text-ivory transition-colors hover:bg-champagne-600 hover:text-charcoal disabled:opacity-50"
          >
            <BagIcon width={15} height={15} /> {justAdded ? 'Added' : 'Add to Cart'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <Rating value={product.rating} reviewCount={product.reviewCount} />
        <Link to={`/product/${product.slug}`} className="text-[15px] text-charcoal hover:text-champagne-700 transition-colors">
          {product.name}
        </Link>
        <Price price={product.price} compareAtPrice={product.compareAtPrice} />
      </div>
    </div>
  )
}
