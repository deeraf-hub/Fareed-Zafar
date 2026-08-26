import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getProduct, relatedProducts } from '@/data/products'
import { getCategory } from '@/data/categories'
import { reviewsForProduct } from '@/data/reviews'
import { siteConfig } from '@/config/site'
import { formatDate, formatPrice } from '@/lib/format'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useToast } from '@/context/ToastContext'
import { Seo } from '@/components/Seo'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductGrid } from '@/components/product/ProductGrid'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { Button } from '@/components/ui/Button'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { HeartIcon, TruckIcon, ShieldIcon, GiftIcon } from '@/components/ui/icons'

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-linen">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 text-left text-[11px] uppercase tracking-wideish text-navy-700"
      >
        {title}
        <span className="text-champagne-600">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="animate-slide-down pb-5 text-sm leading-relaxed text-stoneish">{children}</div>
      )}
    </div>
  )
}

export default function ProductDetail() {
  const { slug } = useParams()
  const product = slug ? getProduct(slug) : undefined
  const [quantity, setQuantity] = useState(1)
  const { addItem, openDrawer } = useCart()
  const wishlist = useWishlist()
  const { notify } = useToast()
  const navigate = useNavigate()

  if (!product) return <Navigate to="/404" replace />

  const category = getCategory(product.category)
  const reviews = reviewsForProduct(product.id)
  const saved = wishlist.has(product.id)
  const related = relatedProducts(product)

  const addToCart = () => {
    addItem(product.id, quantity)
    notify(`${product.name} added to your bag`)
    openDrawer()
  }

  return (
    <>
      <Seo
        title={product.name}
        description={product.description}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description,
          sku: product.id,
          brand: { '@type': 'Brand', name: siteConfig.name },
          material: product.materials.join(', '),
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'PKR',
            price: product.price,
            availability: product.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: `${siteConfig.url}/product/${product.slug}`,
          },
        }}
      />

      <div className="container-luxe py-8 lg:py-12">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Shop', to: '/shop' },
            ...(category ? [{ label: category.name, to: `/shop/${category.slug}` }] : []),
            { label: product.name },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:pt-4">
            <p className="eyebrow">{product.collection}</p>
            <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{product.name}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Rating value={product.rating} size="md" showValue />
              <a href="#reviews" className="link-underline text-xs text-stoneish">
                {product.reviewCount} reviews
              </a>
            </div>

            <Price
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              size="lg"
              className="mt-5"
            />

            <p className="mt-6 text-[15px] leading-relaxed text-stoneish">{product.description}</p>

            <dl className="mt-7 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2.5 text-sm">
              <dt className="text-stoneish">Material</dt>
              <dd className="text-navy-700">{product.materials.join(' · ')}</dd>
              <dt className="text-stoneish">Weight</dt>
              <dd className="text-navy-700">{product.details.weight}</dd>
              <dt className="text-stoneish">Dimensions</dt>
              <dd className="text-navy-700">{product.details.dimensions}</dd>
              <dt className="text-stoneish">Stones</dt>
              <dd className="text-navy-700">{product.details.stones}</dd>
              <dt className="text-stoneish">Availability</dt>
              <dd className={product.inStock ? 'text-champagne-700' : 'text-navy-700'}>
                {product.inStock ? `In stock — ${product.stock} available` : 'Sold out'}
              </dd>
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={quantity}
                max={Math.max(1, product.stock)}
                onChange={setQuantity}
              />
              <Button onClick={addToCart} disabled={!product.inStock} size="lg" className="flex-1">
                {product.inStock ? 'Add to Cart' : 'Sold Out'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  const nowSaved = wishlist.toggle(product.id)
                  notify(nowSaved ? 'Saved to your wishlist' : 'Removed from wishlist')
                }}
                aria-pressed={saved}
                aria-label="Add to wishlist"
                className={`grid h-[50px] w-[50px] shrink-0 place-items-center border border-linen transition-colors hover:border-champagne-400 ${
                  saved ? 'text-champagne-600' : 'text-navy-700'
                }`}
              >
                <HeartIcon filled={saved} />
              </button>
            </div>

            <Button
              onClick={() => {
                addItem(product.id, quantity)
                navigate('/checkout')
              }}
              disabled={!product.inStock}
              variant="outline"
              size="lg"
              fullWidth
              className="mt-3"
            >
              Buy Now
            </Button>

            <ul className="mt-8 grid gap-3 border-y border-linen py-6 text-xs text-stoneish">
              <li className="flex items-center gap-3">
                <TruckIcon width={18} height={18} className="text-champagne-600" />
                {siteConfig.commerce.dispatchCopy}
              </li>
              <li className="flex items-center gap-3">
                <ShieldIcon width={18} height={18} className="text-champagne-600" />
                {siteConfig.commerce.returnWindowDays}-day exchange on unworn pieces
              </li>
              <li className="flex items-center gap-3">
                <GiftIcon width={18} height={18} className="text-champagne-600" />
                Arrives in a cream and gold gift box
              </li>
            </ul>

            <div className="mt-2">
              <Accordion title="Description & details" defaultOpen>
                <p>{product.description}</p>
                <ul className="mt-3 space-y-1">
                  <li>Finish: {product.details.finish}</li>
                  <li>Weight: {product.details.weight}</li>
                  <li>Dimensions: {product.details.dimensions}</li>
                  <li>Stones: {product.details.stones}</li>
                </ul>
              </Accordion>
              <Accordion title="Jewellery care">{product.care}</Accordion>
              <Accordion title="Delivery & returns">
                <p>
                  Complimentary delivery on orders above{' '}
                  {formatPrice(siteConfig.commerce.freeDeliveryThreshold)}; a flat{' '}
                  {formatPrice(siteConfig.commerce.deliveryFee)} applies below that. Unworn pieces can
                  be exchanged or returned within {siteConfig.commerce.returnWindowDays} days of
                  delivery in their original packaging.
                </p>
              </Accordion>
            </div>
          </div>
        </div>

        <section id="reviews" className="mt-20 border-t border-linen pt-14">
          <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
            <div>
              <h2 className="text-2xl">Customer Reviews</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="font-display text-4xl text-navy-700">
                  {product.rating.toFixed(1)}
                </span>
                <div>
                  <Rating value={product.rating} size="md" />
                  <p className="mt-1 text-xs text-stoneish">
                    Based on {product.reviewCount} reviews
                  </p>
                </div>
              </div>
              <p className="mt-6 text-xs leading-relaxed text-stoneish">
                Reviews are collected from customers after delivery. Demo content is shown here until
                the reviews service is connected.
              </p>
            </div>

            <ul className="divide-y divide-linen">
              {reviews.map((review) => (
                <li key={review.id} className="py-6 first:pt-0">
                  <Rating value={review.rating} />
                  <h3 className="mt-3 font-display text-lg">{review.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stoneish">{review.body}</p>
                  <p className="mt-3 text-xs text-stoneish">
                    {review.author} · {review.city} · {formatDate(review.date)}
                    {review.verified && ' · Verified purchase'}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-20">
            <SectionHeading title="You May Also Like" align="left" />
            <ProductGrid products={related} className="mt-10" />
          </section>
        )}
      </div>
    </>
  )
}
