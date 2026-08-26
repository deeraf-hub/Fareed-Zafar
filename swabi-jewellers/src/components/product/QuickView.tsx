import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@/types'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { useWishlist } from '@/context/WishlistContext'
import { Modal } from '@/components/ui/Modal'
import { SmartImage } from '@/components/ui/SmartImage'
import { Price } from '@/components/ui/Price'
import { Rating } from '@/components/ui/Rating'
import { Button } from '@/components/ui/Button'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { HeartIcon } from '@/components/ui/icons'
import { siteConfig } from '@/config/site'

interface QuickViewProps {
  product: Product
  open: boolean
  onClose: () => void
}

export function QuickView({ product, open, onClose }: QuickViewProps) {
  const [quantity, setQuantity] = useState(1)
  const { addItem, openDrawer } = useCart()
  const { notify } = useToast()
  const wishlist = useWishlist()
  const saved = wishlist.has(product.id)

  const handleAdd = () => {
    addItem(product.id, quantity)
    notify(`${product.name} added to your bag`)
    onClose()
    openDrawer()
  }

  return (
    <Modal open={open} onClose={onClose} label={`Quick view — ${product.name}`}>
      <div className="grid gap-0 sm:grid-cols-2">
        <SmartImage image={product.images[0]} ratio="aspect-[4/5]" />
        <div className="p-6 sm:p-8">
          <p className="eyebrow">{product.collection}</p>
          <h2 className="mt-2 text-2xl">{product.name}</h2>
          <Rating value={product.rating} count={product.reviewCount} className="mt-3" />
          <Price
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            size="lg"
            className="mt-4"
          />
          <p className="mt-4 text-sm leading-relaxed text-stoneish">{product.description}</p>

          <dl className="mt-5 grid grid-cols-2 gap-y-2 text-xs text-stoneish">
            <dt className="text-navy-700">Material</dt>
            <dd>{product.materials.join(', ')}</dd>
            <dt className="text-navy-700">Weight</dt>
            <dd>{product.details.weight}</dd>
            <dt className="text-navy-700">Availability</dt>
            <dd>{product.inStock ? `In stock (${product.stock})` : 'Sold out'}</dd>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantityStepper
              value={quantity}
              max={Math.max(1, product.stock)}
              onChange={setQuantity}
              size="sm"
            />
            <Button onClick={handleAdd} disabled={!product.inStock} className="flex-1">
              {product.inStock ? 'Add to Cart' : 'Sold Out'}
            </Button>
            <button
              type="button"
              onClick={() => {
                const nowSaved = wishlist.toggle(product.id)
                notify(nowSaved ? 'Saved to your wishlist' : 'Removed from wishlist')
              }}
              aria-pressed={saved}
              aria-label="Toggle wishlist"
              className={`grid h-11 w-11 shrink-0 place-items-center border border-linen transition-colors hover:border-champagne-400 ${
                saved ? 'text-champagne-600' : 'text-navy-700'
              }`}
            >
              <HeartIcon filled={saved} />
            </button>
          </div>

          <p className="mt-4 text-xs text-stoneish">{siteConfig.commerce.dispatchCopy}</p>

          <Link
            to={`/product/${product.slug}`}
            onClick={onClose}
            className="link-underline mt-5 inline-block text-[11px] uppercase tracking-wideish text-navy-700"
          >
            View full details
          </Link>
        </div>
      </div>
    </Modal>
  )
}
