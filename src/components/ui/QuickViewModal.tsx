import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@/types'
import { Photo } from '@/components/ui/Photo'
import { Price } from './Price'
import { Rating } from './Rating'
import { CloseIcon, HeartIcon } from './Icons'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'

export function QuickViewModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { addItem } = useCart()
  const { toggle, isWishlisted } = useWishlist()

  useEffect(() => {
    if (!product) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [product, onClose])

  if (!product) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fadeIn">
      <button aria-label="Close" className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative grid w-full max-w-3xl grid-cols-1 gap-0 overflow-hidden bg-ivory shadow-lift sm:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center bg-ivory/90 text-charcoal"
        >
          <CloseIcon />
        </button>
        <div className="aspect-square sm:aspect-auto">
          <Photo photoKey={product.images[0]} className="h-full w-full" />
        </div>
        <div className="flex flex-col gap-4 p-6 sm:p-8">
          <div>
            <Rating value={product.rating} reviewCount={product.reviewCount} />
            <h3 className="mt-2 text-2xl text-charcoal">{product.name}</h3>
          </div>
          <Price price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
          <p className="text-sm leading-relaxed text-charcoal-muted">{product.description}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-charcoal-muted">
            <span>Material: {product.material}</span>
            <span>{product.inStock ? 'In Stock' : 'Sold Out'}</span>
          </div>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => {
                addItem(product.id, 1)
                onClose()
              }}
              className="btn-primary flex-1"
            >
              Add to Cart
            </button>
            <button
              type="button"
              onClick={() => toggle(product.id)}
              aria-label="Toggle wishlist"
              className="flex h-[50px] w-[50px] flex-none items-center justify-center border border-beige-dark text-charcoal hover:border-champagne-600"
            >
              <HeartIcon filled={isWishlisted(product.id)} className={isWishlisted(product.id) ? 'text-champagne-600' : ''} />
            </button>
          </div>
          <Link to={`/product/${product.slug}`} onClick={onClose} className="btn-ghost self-start">
            View Full Details
          </Link>
        </div>
      </div>
    </div>
  )
}
