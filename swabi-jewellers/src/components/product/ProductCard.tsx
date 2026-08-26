import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@/types'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useToast } from '@/context/ToastContext'
import { SmartImage } from '@/components/ui/SmartImage'
import { Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { EyeIcon, HeartIcon } from '@/components/ui/icons'
import { QuickView } from './QuickView'

interface ProductCardProps {
  product: Product
  showRating?: boolean
  priority?: boolean
}

export function ProductCard({ product, showRating = false, priority = false }: ProductCardProps) {
  const { addItem, openDrawer } = useCart()
  const wishlist = useWishlist()
  const { notify } = useToast()
  const [quickViewOpen, setQuickViewOpen] = useState(false)

  const saved = wishlist.has(product.id)

  const handleAdd = () => {
    if (!product.inStock) return
    addItem(product.id)
    notify(`${product.name} added to your bag`)
    openDrawer()
  }

  const handleWishlist = () => {
    const nowSaved = wishlist.toggle(product.id)
    notify(nowSaved ? `${product.name} saved to your wishlist` : `${product.name} removed from wishlist`)
  }

  return (
    <>
      <article className="group relative flex h-full flex-col">
        <div className="relative overflow-hidden bg-cream">
          <Link to={`/product/${product.slug}`} aria-label={product.name} className="block">
            <SmartImage
              image={product.images[0]}
              ratio="aspect-[4/5]"
              priority={priority}
              className="card-hover-media"
            />
            {product.images[1] && (
              <span className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-luxe group-hover:opacity-100">
                <SmartImage image={product.images[1]} ratio="aspect-[4/5]" />
              </span>
            )}
          </Link>

          {product.badges && product.badges.length > 0 && (
            <ul className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
              {product.badges.slice(0, 2).map((badge) => (
                <li
                  key={badge}
                  className="bg-ivory/95 px-2.5 py-1 text-[9px] uppercase tracking-wideish text-navy-700"
                >
                  {badge}
                </li>
              ))}
            </ul>
          )}

          {!product.inStock && (
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-navy-900/70 py-2 text-center text-[10px] uppercase tracking-luxe text-ivory">
              Sold out
            </span>
          )}

          <button
            type="button"
            onClick={handleWishlist}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ivory/90 transition-all duration-500 ease-luxe hover:bg-ivory ${
              saved ? 'text-champagne-600' : 'text-navy-700'
            }`}
          >
            <HeartIcon filled={saved} width={17} height={17} />
          </button>

          <div className="absolute inset-x-0 bottom-0 flex translate-y-3 flex-col gap-px opacity-0 transition-all duration-500 ease-luxe group-hover:translate-y-0 group-hover:opacity-100 sm:flex-row">
            <button
              type="button"
              onClick={() => setQuickViewOpen(true)}
              className="flex flex-1 items-center justify-center gap-1.5 bg-ivory/95 py-3 text-[10px] uppercase tracking-wideish text-navy-700 transition-colors hover:bg-ivory"
            >
              <EyeIcon width={15} height={15} />
              Quick View
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!product.inStock}
              className="flex-1 bg-navy-700 py-3 text-[10px] uppercase tracking-wideish text-ivory transition-colors hover:bg-navy-800 disabled:opacity-60"
            >
              {product.inStock ? 'Add to Cart' : 'Sold Out'}
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col pt-4">
          <p className="text-[10px] uppercase tracking-wideish text-champagne-600">
            {product.collection}
          </p>
          <h3 className="mt-1.5 font-display text-lg leading-snug">
            <Link to={`/product/${product.slug}`} className="link-underline">
              {product.name}
            </Link>
          </h3>
          {showRating && (
            <Rating value={product.rating} count={product.reviewCount} className="mt-2" />
          )}
          <Price price={product.price} compareAtPrice={product.compareAtPrice} className="mt-2" />
        </div>
      </article>

      <QuickView product={product} open={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
    </>
  )
}
