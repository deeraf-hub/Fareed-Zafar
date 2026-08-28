import { Link } from 'react-router-dom'
import { useWishlist } from '@/context/WishlistContext'
import { useCart } from '@/context/CartContext'
import { products } from '@/data/products'
import { PlaceholderArt } from '@/lib/placeholderArt'
import { Price } from '@/components/ui/Price'
import { TrashIcon, HeartIcon } from '@/components/ui/Icons'
import { useSeo } from '@/lib/useSeo'

export function Wishlist() {
  useSeo('Wishlist')
  const { productIds, remove } = useWishlist()
  const { addItem } = useCart()

  const items = products.filter((p) => productIds.includes(p.id))

  if (items.length === 0) {
    return (
      <div className="container-lux flex flex-col items-center gap-6 py-28 text-center">
        <HeartIcon width={44} height={44} className="text-champagne-500" />
        <h1 className="text-2xl text-charcoal">Your wishlist is empty</h1>
        <p className="max-w-sm text-charcoal-muted">Tap the heart icon on any piece to save it here for later.</p>
        <Link to="/shop" className="btn-primary">
          Browse Jewellery
        </Link>
      </div>
    )
  }

  return (
    <div className="container-lux py-12 sm:py-16">
      <h1 className="mb-2 text-3xl sm:text-4xl text-charcoal">My Wishlist</h1>
      <p className="mb-10 text-charcoal-muted">{items.length} saved piece{items.length > 1 ? 's' : ''}</p>

      <div className="flex flex-col divide-y divide-beige">
        {items.map((product) => (
          <div key={product.id} className="flex flex-wrap items-center gap-4 py-6 sm:gap-6">
            <Link to={`/product/${product.slug}`} className="h-28 w-24 flex-none overflow-hidden">
              <PlaceholderArt scene={product.images[0]} className="h-full w-full" />
            </Link>
            <div className="min-w-[160px] flex-1">
              <Link to={`/product/${product.slug}`} className="text-charcoal hover:text-champagne-700">
                {product.name}
              </Link>
              <p className="mt-1 text-xs text-charcoal-muted">{product.inStock ? 'In Stock' : 'Sold Out'}</p>
            </div>
            <Price price={product.price} compareAtPrice={product.compareAtPrice} />
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                disabled={!product.inStock}
                onClick={() => {
                  addItem(product.id, 1)
                  remove(product.id)
                }}
                className="btn-secondary py-2.5 text-xs"
              >
                Move to Cart
              </button>
              <button
                type="button"
                onClick={() => remove(product.id)}
                aria-label="Remove from wishlist"
                className="text-charcoal-muted hover:text-charcoal"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
