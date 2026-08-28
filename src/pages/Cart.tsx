import { Link } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import { getProductBySlug, products } from '@/data/products'
import { PlaceholderArt } from '@/lib/placeholderArt'
import { formatPKR } from '@/lib/currency'
import { MinusIcon, PlusIcon, TrashIcon, BagIcon } from '@/components/ui/Icons'
import { useSeo } from '@/lib/useSeo'
import { siteConfig } from '@/config/site'

export function Cart() {
  useSeo('Shopping Cart')
  const { lines, subtotal, deliveryFee, total, updateQuantity, removeItem } = useCart()

  const lineItems = lines
    .map((line) => ({ line, product: products.find((p) => p.id === line.productId) ?? getProductBySlug(line.productId) }))
    .filter((entry): entry is { line: typeof lines[number]; product: NonNullable<typeof entry.product> } => Boolean(entry.product))

  if (lineItems.length === 0) {
    return (
      <div className="container-lux flex flex-col items-center gap-6 py-28 text-center">
        <BagIcon width={48} height={48} className="text-champagne-500" />
        <h1 className="text-2xl text-charcoal">Your cart is empty</h1>
        <p className="max-w-sm text-charcoal-muted">Browse the collection and find something beautiful to add.</p>
        <Link to="/shop" className="btn-primary">
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="container-lux py-12 sm:py-16">
      <h1 className="mb-10 text-3xl sm:text-4xl text-charcoal">Shopping Cart</h1>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col divide-y divide-beige">
          {lineItems.map(({ line, product }) => (
            <div key={product.id} className="flex gap-4 py-6 sm:gap-6">
              <Link to={`/product/${product.slug}`} className="h-28 w-24 flex-none overflow-hidden sm:h-32 sm:w-28">
                <PlaceholderArt scene={product.images[0]} className="h-full w-full" />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link to={`/product/${product.slug}`} className="text-charcoal hover:text-champagne-700">
                      {product.name}
                    </Link>
                    <p className="mt-1 text-xs text-charcoal-muted">{product.material}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    aria-label="Remove item"
                    className="text-charcoal-muted hover:text-charcoal"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="flex items-end justify-between">
                  <div className="flex items-center border border-beige-dark">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(product.id, line.quantity - 1)}
                      className="flex h-10 w-9 items-center justify-center text-charcoal hover:text-champagne-700"
                    >
                      <MinusIcon />
                    </button>
                    <span className="w-7 text-center text-sm">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(product.id, line.quantity + 1)}
                      className="flex h-10 w-9 items-center justify-center text-charcoal hover:text-champagne-700"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                  <p className="text-charcoal">{formatPKR(product.price * line.quantity)}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-6">
            <Link to="/shop" className="btn-ghost">
              ← Continue Shopping
            </Link>
          </div>
        </div>

        <div className="h-fit bg-cream/60 p-7">
          <h2 className="mb-5 text-lg text-charcoal">Order Summary</h2>
          <div className="flex flex-col gap-3 text-sm text-charcoal-soft">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPKR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{deliveryFee === 0 ? 'Complimentary' : formatPKR(deliveryFee)}</span>
            </div>
            {deliveryFee > 0 && (
              <p className="text-xs text-champagne-700">
                Add {formatPKR(siteConfig.freeDeliveryThreshold - subtotal)} more for free delivery.
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-between border-t border-beige-dark pt-5 text-base text-charcoal">
            <span>Total</span>
            <span>{formatPKR(total)}</span>
          </div>
          <Link to="/checkout" className="btn-primary mt-6 w-full">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}
