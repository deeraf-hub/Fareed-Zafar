import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import { SmartImage } from '@/components/ui/SmartImage'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { ButtonLink } from '@/components/ui/Button'
import { CloseIcon, TrashIcon } from '@/components/ui/icons'
import { formatPrice } from '@/lib/format'
import { siteConfig } from '@/config/site'

export function CartDrawer() {
  const { entries, subtotal, itemCount, isDrawerOpen, closeDrawer, setQuantity, removeItem } = useCart()

  useEffect(() => {
    if (!isDrawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [isDrawerOpen, closeDrawer])

  if (!isDrawerOpen) return null

  const remaining = siteConfig.commerce.freeDeliveryThreshold - subtotal

  return (
    <div className="fixed inset-0 z-[85]">
      <div
        className="absolute inset-0 animate-fade-in bg-navy-900/40"
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className="absolute right-0 top-0 flex h-full w-[min(92vw,26rem)] animate-slide-down flex-col bg-ivory shadow-lift"
      >
        <header className="flex items-center justify-between border-b border-linen px-6 py-5">
          <h2 className="text-lg">
            Your Bag <span className="text-sm text-stoneish">({itemCount})</span>
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="text-navy-700 transition-colors hover:text-champagne-600"
            aria-label="Close bag"
          >
            <CloseIcon />
          </button>
        </header>

        {entries.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <p className="text-sm text-stoneish">Your bag is empty.</p>
            <ButtonLink to="/shop" onClick={closeDrawer} variant="outline">
              Start Shopping
            </ButtonLink>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-linen/70 overflow-y-auto px-6">
              {entries.map((entry) => (
                <li key={entry.productId} className="flex gap-4 py-5">
                  <Link to={`/product/${entry.product.slug}`} onClick={closeDrawer} className="w-20 shrink-0">
                    <SmartImage
                      image={entry.product.images[0]}
                      ratio="aspect-[4/5]"
                      width={200}
                      height={250}
                      sizes="80px"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link
                      to={`/product/${entry.product.slug}`}
                      onClick={closeDrawer}
                      className="font-display text-base leading-snug hover:text-champagne-700"
                    >
                      {entry.product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-stoneish">{entry.product.collection}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <QuantityStepper
                        value={entry.quantity}
                        max={entry.product.stock}
                        onChange={(quantity) => setQuantity(entry.productId, quantity)}
                        size="sm"
                      />
                      <span className="text-sm text-navy-700">{formatPrice(entry.lineTotal)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(entry.productId)}
                    className="self-start text-stoneish transition-colors hover:text-navy-700"
                    aria-label={`Remove ${entry.product.name}`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="border-t border-linen px-6 py-5">
              {remaining > 0 ? (
                <p className="mb-3 text-center text-xs text-stoneish">
                  Add {formatPrice(remaining)} more for complimentary delivery.
                </p>
              ) : (
                <p className="mb-3 text-center text-xs text-champagne-700">
                  You have earned complimentary delivery.
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-stoneish">Subtotal</span>
                <span className="text-base text-navy-700">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-stoneish">
                Delivery calculated at checkout · {siteConfig.commerce.dispatchCopy}
              </p>
              <div className="mt-4 grid gap-2">
                <ButtonLink to="/checkout" onClick={closeDrawer} fullWidth>
                  Proceed to Checkout
                </ButtonLink>
                <ButtonLink to="/cart" onClick={closeDrawer} variant="outline" fullWidth>
                  View Bag
                </ButtonLink>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
