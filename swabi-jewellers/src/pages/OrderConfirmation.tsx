import { Link, useParams } from 'react-router-dom'
import { useAccount } from '@/context/AccountContext'
import { siteConfig } from '@/config/site'
import { formatDate, formatPrice } from '@/lib/format'
import { Seo } from '@/components/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { CheckIcon } from '@/components/ui/icons'

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const { orders } = useAccount()
  const order = orders.find((entry) => entry.id === orderId)

  return (
    <>
      <Seo title="Order Confirmed" noIndex />
      <div className="container-luxe py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-champagne-300 text-champagne-600">
            <CheckIcon width={26} height={26} />
          </span>
          <h1 className="mt-8 text-3xl sm:text-4xl">Thank you for your order</h1>
          <p className="mt-4 text-sm leading-relaxed text-stoneish">
            {order
              ? `We have received order ${order.id} and will confirm it by phone shortly.`
              : 'We have received your order and will confirm it by phone shortly.'}{' '}
            For anything urgent, call{' '}
            <a href={siteConfig.contact.phoneHref} className="link-underline text-navy-700">
              {siteConfig.contact.phone}
            </a>
            .
          </p>
        </div>

        {order && (
          <div className="mx-auto mt-12 max-w-2xl border border-linen bg-white p-7 text-left">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-linen pb-5">
              <div>
                <p className="eyebrow">Order</p>
                <p className="mt-1 font-display text-2xl">{order.id}</p>
              </div>
              <div className="text-right text-xs text-stoneish">
                <p>{formatDate(order.placedAt)}</p>
                <p className="mt-1 text-champagne-700">{order.status}</p>
              </div>
            </div>

            <ul className="divide-y divide-linen">
              {order.lines.map((line) => (
                <li key={line.productId} className="flex justify-between gap-4 py-4 text-sm">
                  <span>
                    <Link to={`/product/${line.slug}`} className="link-underline text-navy-700">
                      {line.name}
                    </Link>
                    <span className="block text-xs text-stoneish">Qty {line.quantity}</span>
                  </span>
                  <span>{formatPrice(line.price * line.quantity)}</span>
                </li>
              ))}
            </ul>

            <dl className="space-y-2.5 border-t border-linen pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-stoneish">Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-champagne-700">
                  <dt>Discount</dt>
                  <dd>− {formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-stoneish">Delivery</dt>
                <dd>{order.deliveryFee === 0 ? 'Complimentary' : formatPrice(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-linen pt-3 text-base">
                <dt>Total</dt>
                <dd className="font-medium">{formatPrice(order.total)}</dd>
              </div>
            </dl>

            <div className="mt-6 grid gap-6 border-t border-linen pt-6 text-sm sm:grid-cols-2">
              <div>
                <p className="eyebrow">Delivering to</p>
                <p className="mt-2 text-navy-700">{order.customer.fullName}</p>
                <p className="text-stoneish">
                  {order.address.line1}, {order.address.area}
                  <br />
                  {order.address.city} {order.address.postalCode}
                </p>
                <p className="mt-1 text-stoneish">{order.customer.phone}</p>
              </div>
              <div>
                <p className="eyebrow">Payment</p>
                <p className="mt-2 text-navy-700">{order.paymentMethod}</p>
                <p className="mt-1 text-xs text-stoneish">{siteConfig.commerce.dispatchCopy}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/shop">Continue Shopping</ButtonLink>
          <ButtonLink to="/account" variant="outline">
            View My Orders
          </ButtonLink>
        </div>
      </div>
    </>
  )
}
