import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/format'
import { siteConfig } from '@/config/site'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Button, ButtonLink } from '@/components/ui/Button'
import { TrashIcon } from '@/components/ui/icons'

export default function Cart() {
  const {
    entries,
    subtotal,
    discount,
    deliveryFee,
    total,
    promo,
    promoError,
    applyPromo,
    removePromo,
    setQuantity,
    removeItem,
  } = useCart()
  const [code, setCode] = useState('')

  return (
    <>
      <Seo title="Shopping Bag" description="Review the pieces in your Swabi Jewellers bag." noIndex />
      <PageHeader
        eyebrow="Your selection"
        title="Shopping Bag"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Bag' }]}
      />

      <div className="container-luxe py-12 lg:py-16">
        {entries.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="text-2xl">Your bag is empty</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-stoneish">
              Once you add a piece it will appear here, saved for your next visit.
            </p>
            <ButtonLink to="/shop" className="mt-8">
              Shop the Collection
            </ButtonLink>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
            <div>
              <ul className="divide-y divide-linen border-y border-linen">
                {entries.map((entry) => (
                  <li key={entry.productId} className="flex gap-4 py-6 sm:gap-6">
                    <Link to={`/product/${entry.product.slug}`} className="w-24 shrink-0 sm:w-32">
                      <SmartImage
                        image={entry.product.images[0]}
                        ratio="aspect-[4/5]"
                        width={300}
                        height={375}
                        sizes="128px"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wideish text-champagne-600">
                            {entry.product.collection}
                          </p>
                          <h2 className="mt-1 font-display text-lg">
                            <Link to={`/product/${entry.product.slug}`} className="link-underline">
                              {entry.product.name}
                            </Link>
                          </h2>
                          <p className="mt-1 text-xs text-stoneish">
                            {entry.product.materials.join(' · ')}
                          </p>
                        </div>
                        <p className="text-sm text-navy-700">{formatPrice(entry.product.price)}</p>
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                        <QuantityStepper
                          value={entry.quantity}
                          max={entry.product.stock}
                          onChange={(quantity) => setQuantity(entry.productId, quantity)}
                          size="sm"
                        />
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-navy-700">{formatPrice(entry.lineTotal)}</span>
                          <button
                            type="button"
                            onClick={() => removeItem(entry.productId)}
                            className="flex items-center gap-1.5 text-xs text-stoneish transition-colors hover:text-navy-700"
                          >
                            <TrashIcon />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <ButtonLink to="/shop" variant="ghost" className="mt-6 px-0">
                ← Continue Shopping
              </ButtonLink>
            </div>

            <aside className="lg:sticky lg:top-32 lg:h-fit">
              <div className="border border-linen bg-white p-7">
                <h2 className="text-xl">Order Summary</h2>

                <form
                  className="mt-6"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (applyPromo(code)) setCode('')
                  }}
                >
                  <label htmlFor="promo" className="text-[11px] uppercase tracking-wideish text-stoneish">
                    Discount code
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="promo"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="Enter code"
                      className="field flex-1"
                    />
                    <Button type="submit" variant="outline" size="sm">
                      Apply
                    </Button>
                  </div>
                  {promoError && <p className="mt-2 text-xs text-champagne-700">{promoError}</p>}
                  {promo && (
                    <p className="mt-2 flex items-center justify-between text-xs text-champagne-700">
                      <span>
                        {promo.code} applied — {promo.percentOff}% off
                      </span>
                      <button type="button" onClick={removePromo} className="link-underline">
                        Remove
                      </button>
                    </p>
                  )}
                </form>

                <dl className="mt-7 space-y-3 border-t border-linen pt-6 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stoneish">Subtotal</dt>
                    <dd>{formatPrice(subtotal)}</dd>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-champagne-700">
                      <dt>Discount</dt>
                      <dd>− {formatPrice(discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-stoneish">Delivery</dt>
                    <dd>{deliveryFee === 0 ? 'Complimentary' : formatPrice(deliveryFee)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-linen pt-4 text-base">
                    <dt>Total</dt>
                    <dd className="font-medium">{formatPrice(total)}</dd>
                  </div>
                </dl>

                <ButtonLink to="/checkout" fullWidth className="mt-7">
                  Proceed to Checkout
                </ButtonLink>

                <p className="mt-4 text-center text-xs text-stoneish">
                  Free delivery above {formatPrice(siteConfig.commerce.freeDeliveryThreshold)}
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
