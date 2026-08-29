import { useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { CheckCircle2, Phone } from 'lucide-react'
import { formatPKR } from '../lib/format.js'
import { BUSINESS } from '../data/business.js'

export default function OrderSuccess() {
  const { state } = useLocation()
  const order = state?.order

  useEffect(() => {
    document.title = 'Order Received | Hand Tools Trading Corporation'
  }, [])

  if (!order) return <Navigate to="/" replace />

  return (
    <div className="container-app flex flex-col items-center py-16 md:py-24">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
        <CheckCircle2 size={36} />
      </div>
      <h1 className="mt-6 text-center font-heading text-2xl font-bold text-navy-900 md:text-3xl">
        Order Request Received!
      </h1>
      <p className="mt-3 max-w-md text-center text-sm text-steel-500 md:text-base">
        Thank you, {order.fullName}. Your order request <span className="font-semibold text-navy-900">#{order.orderId}</span>{' '}
        has been received. Our team will call you at {order.phone} shortly to confirm delivery and
        payment details.
      </p>

      <div className="mt-8 w-full max-w-md rounded-lg border border-steel-100 bg-white p-6">
        <h2 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-navy-900">
          Order Summary
        </h2>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-steel-600">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium text-navy-900">{formatPKR(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-steel-100 pt-4">
          <span className="font-semibold text-navy-900">Total</span>
          <span className="font-heading text-lg font-bold text-navy-900">{formatPKR(order.total)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/shop"
          className="rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600"
        >
          Continue Shopping
        </Link>
        <a
          href={`tel:${BUSINESS.phoneHref}`}
          className="flex items-center gap-2 rounded-md border border-navy-800 px-6 py-3 text-sm font-semibold text-navy-800 hover:bg-navy-800 hover:text-white"
        >
          <Phone size={16} />
          Call Us
        </a>
      </div>
    </div>
  )
}
