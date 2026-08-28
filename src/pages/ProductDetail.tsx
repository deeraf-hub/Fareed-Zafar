import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getProductBySlug, getRelatedProducts } from '@/data/products'
import { PlaceholderArt } from '@/lib/placeholderArt'
import { Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { ProductGrid } from '@/components/ui/ProductGrid'
import { HeartIcon, MinusIcon, PlusIcon, TruckIcon, ShieldIcon, GiftIcon } from '@/components/ui/Icons'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useSeo } from '@/lib/useSeo'
import { siteConfig } from '@/config/site'

type Tab = 'description' | 'details' | 'reviews' | 'delivery'

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const product = slug ? getProductBySlug(slug) : undefined
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { toggle, isWishlisted } = useWishlist()

  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState<Tab>('description')
  const [zoomed, setZoomed] = useState(false)

  useSeo(
    product ? product.name : 'Product Not Found',
    product ? `${product.name} — ${product.material}. ${product.description}` : undefined
  )

  if (!product) {
    return <Navigate to="/shop" replace />
  }

  const related = getRelatedProducts(product)

  return (
    <div className="container-lux py-10 sm:py-16">
      <nav className="mb-8 flex flex-wrap items-center gap-1.5 text-xs text-charcoal-muted">
        <Link to="/" className="hover:text-champagne-700">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-champagne-700">Jewellery</Link>
        <span>/</span>
        <Link to={`/shop/${product.category}`} className="capitalize hover:text-champagne-700">
          {product.category.replace('-', ' ')}
        </Link>
        <span>/</span>
        <span className="text-charcoal">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-3">
          <div
            className="relative aspect-square overflow-hidden bg-ivory-soft cursor-zoom-in"
            onClick={() => setZoomed((z) => !z)}
          >
            <PlaceholderArt
              scene={product.images[activeImage]}
              className={`h-full w-full transition-transform duration-500 ${zoomed ? 'scale-150' : 'scale-100'}`}
            />
            <span className="absolute bottom-3 right-3 bg-ivory/90 px-2 py-1 text-[10px] uppercase tracking-widest2 text-charcoal-muted">
              {zoomed ? 'Click to shrink' : 'Click to zoom'}
            </span>
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((scene, i) => (
                <button
                  key={`${scene}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-20 flex-none overflow-hidden border transition-colors ${
                    activeImage === i ? 'border-champagne-600' : 'border-transparent'
                  }`}
                >
                  <PlaceholderArt scene={scene} className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <p className="eyebrow mb-2 capitalize">{product.category.replace('-', ' ')}</p>
            <h1 className="text-3xl sm:text-4xl text-charcoal">{product.name}</h1>
            <button type="button" onClick={() => setTab('reviews')} className="mt-2">
              <Rating value={product.rating} reviewCount={product.reviewCount} />
            </button>
          </div>

          <Price price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />

          <p className="leading-relaxed text-charcoal-muted">{product.description}</p>

          <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-charcoal-soft">
            <span>Material: <strong className="font-medium">{product.material}</strong></span>
            <span>
              {product.inStock ? (
                <span className="text-champagne-700">In Stock ({product.stockCount} available)</span>
              ) : (
                <span className="text-charcoal-muted">Sold Out</span>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center border border-beige-dark">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-12 w-11 items-center justify-center text-charcoal hover:text-champagne-700"
              >
                <MinusIcon />
              </button>
              <span className="w-8 text-center text-sm">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => Math.min(product.stockCount || 10, q + 1))}
                className="flex h-12 w-11 items-center justify-center text-charcoal hover:text-champagne-700"
              >
                <PlusIcon />
              </button>
            </div>

            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => addItem(product.id, quantity)}
              className="btn-primary flex-1 sm:flex-none"
            >
              Add to Cart
            </button>
            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => {
                addItem(product.id, quantity)
                navigate('/checkout')
              }}
              className="btn-secondary flex-1 sm:flex-none"
            >
              Buy Now
            </button>
            <button
              type="button"
              onClick={() => toggle(product.id)}
              aria-label="Toggle wishlist"
              className="flex h-[50px] w-[50px] flex-none items-center justify-center border border-beige-dark hover:border-champagne-600"
            >
              <HeartIcon filled={isWishlisted(product.id)} className={isWishlisted(product.id) ? 'text-champagne-600' : ''} />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-beige pt-6 text-sm text-charcoal-soft">
            <div className="flex items-center gap-3">
              <TruckIcon width={18} height={18} className="flex-none text-champagne-600" />
              Complimentary delivery on orders above {siteConfig.currencySymbol} {siteConfig.freeDeliveryThreshold.toLocaleString()}.
            </div>
            <div className="flex items-center gap-3">
              <ShieldIcon width={18} height={18} className="flex-none text-champagne-600" />
              7-day returns on unworn, unused items.
            </div>
            <div className="flex items-center gap-3">
              <GiftIcon width={18} height={18} className="flex-none text-champagne-600" />
              Arrives in signature gift-ready packaging.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 border-t border-beige">
        <div className="flex flex-wrap gap-1 border-b border-beige">
          {(
            [
              ['description', 'Description'],
              ['details', 'Details'],
              ['reviews', `Reviews (${product.reviewCount})`],
              ['delivery', 'Delivery & Returns'],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`px-4 py-4 text-xs uppercase tracking-[0.14em] transition-colors ${
                tab === value ? 'text-champagne-700 border-b-2 border-champagne-600' : 'text-charcoal-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl py-8 text-sm leading-relaxed text-charcoal-soft">
          {tab === 'description' && <p>{product.description}</p>}
          {tab === 'details' && (
            <ul className="flex flex-col gap-2">
              <li>Material: {product.material}</li>
              <li>Weight: {product.weight}</li>
              <li>Dimensions: {product.dimensions}</li>
              <li>Care: {product.careInstructions}</li>
            </ul>
          )}
          {tab === 'reviews' && (
            <div className="flex flex-col gap-6">
              <Rating value={product.rating} reviewCount={product.reviewCount} size={16} />
              {product.reviews.map((review) => (
                <div key={review.id} className="border-b border-beige pb-5">
                  <div className="flex items-center justify-between">
                    <p className="text-charcoal">{review.title}</p>
                    <Rating value={review.rating} size={12} />
                  </div>
                  <p className="mt-1 text-xs text-charcoal-muted">
                    {review.author} {review.verified && '· Verified Purchase'} · {review.date}
                  </p>
                  <p className="mt-2">{review.body}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'delivery' && (
            <div className="flex flex-col gap-4">
              <p>{siteConfig.policies.delivery}</p>
              <p>{siteConfig.policies.returns}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16 border-t border-beige pt-14">
          <h2 className="mb-8 text-2xl text-charcoal">You May Also Like</h2>
          <ProductGrid products={related} columns={4} />
        </div>
      )}
    </div>
  )
}
