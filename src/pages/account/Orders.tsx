import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { formatPKR } from '@/lib/currency'
import { useSeo } from '@/lib/useSeo'

const trackSteps = ['Processing', 'Confirmed', 'Shipped', 'Delivered'] as const

export function Orders() {
  useSeo('My Orders')
  const { user } = useAuth()

  if (!user) return null

  if (user.orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-charcoal-muted">You haven&rsquo;t placed any orders yet.</p>
        <Link to="/shop" className="btn-primary">
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {user.orders.map((order) => {
        const stepIndex = order.status === 'Cancelled' ? -1 : trackSteps.indexOf(order.status)
        return (
          <div key={order.id} className="border border-beige-dark p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-beige pb-4">
              <div>
                <p className="text-charcoal">Order {order.id}</p>
                <p className="text-xs text-charcoal-muted">{new Date(order.date).toLocaleString()}</p>
              </div>
              <p className="text-charcoal">{formatPKR(order.total)}</p>
            </div>

            {stepIndex >= 0 ? (
              <div className="flex items-center justify-between py-6">
                {trackSteps.map((step, i) => (
                  <div key={step} className="flex flex-1 flex-col items-center text-center">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${i <= stepIndex ? 'bg-champagne-600' : 'bg-beige-dark'}`}
                    />
                    <span className={`mt-2 text-[10px] uppercase tracking-wide ${i <= stepIndex ? 'text-champagne-700' : 'text-charcoal-muted'}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-charcoal-muted">This order was cancelled.</p>
            )}

            <div className="flex flex-col gap-2 border-t border-beige pt-4 text-sm text-charcoal-soft">
              {order.items.map((item) => (
                <div key={item.productId} className="flex justify-between">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{formatPKR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-charcoal-muted">Payment: {order.paymentMethod}</p>
          </div>
        )
      })}
    </div>
  )
}
