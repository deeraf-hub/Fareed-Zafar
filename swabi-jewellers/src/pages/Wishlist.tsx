import { Link } from 'react-router-dom'
import { useWishlist } from '@/context/WishlistContext'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { getProductsByIds } from '@/data/products'
import { formatPrice } from '@/lib/format'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Rating } from '@/components/ui/Rating'
import { TrashIcon } from '@/components/ui/icons'

export default function Wishlist() {
  const { ids, remove, clear } = useWishlist()
  const { addItem, openDrawer } = useCart()
  const { notify } = useToast()
  const products = getProductsByIds(ids)

  const moveToBag = (productId: string, name: string) => {
    addItem(productId)
    remove(productId)
    notify(`${name} moved to your bag`)
    openDrawer()
  }

  return (
    <>
      <Seo title="Wishlist" description="The pieces you have saved at Swabi Jewellers." noIndex />
      <PageHeader
        eyebrow="Saved for later"
        title="My Wishlist"
        description="Your saved pieces stay here on this device until you move them to your bag."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]}
      />

      <div className="container-luxe py-12 lg:py-16">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="text-2xl">Your wishlist is empty</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-stoneish">
              Tap the heart on any piece to save it here.
            </p>
            <ButtonLink to="/shop" className="mt-8">
              Browse the Collection
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-linen pb-4">
              <p className="text-[11px] uppercase tracking-wideish text-stoneish">
                {products.length} saved {products.length === 1 ? 'piece' : 'pieces'}
              </p>
              <button
                type="button"
                onClick={clear}
                className="link-underline text-[11px] uppercase tracking-wideish text-champagne-700"
              >
                Clear all
              </button>
            </div>

            <ul className="divide-y divide-linen">
              {products.map((product) => (
                <li key={product.id} className="flex flex-col gap-4 py-6 sm:flex-row sm:gap-6">
                  <Link to={`/product/${product.slug}`} className="w-28 shrink-0 sm:w-36">
                    <SmartImage
                      image={product.images[0]}
                      ratio="aspect-[4/5]"
                      width={300}
                      height={375}
                      sizes="144px"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <p className="text-[10px] uppercase tracking-wideish text-champagne-600">
                      {product.collection}
                    </p>
                    <h2 className="mt-1 font-display text-xl">
                      <Link to={`/product/${product.slug}`} className="link-underline">
                        {product.name}
                      </Link>
                    </h2>
                    <Rating value={product.rating} count={product.reviewCount} className="mt-2" />
                    <p className="mt-2 max-w-lg text-sm text-stoneish">{product.description}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-4 pt-5">
                      <span className="text-base text-navy-700">{formatPrice(product.price)}</span>
                      <Button
                        size="sm"
                        onClick={() => moveToBag(product.id, product.name)}
                        disabled={!product.inStock}
                      >
                        {product.inStock ? 'Move to Bag' : 'Sold Out'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
                        className="flex items-center gap-1.5 text-xs text-stoneish transition-colors hover:text-navy-700"
                      >
                        <TrashIcon />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}
