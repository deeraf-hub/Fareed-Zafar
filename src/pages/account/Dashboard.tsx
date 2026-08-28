import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { formatPKR } from '@/lib/currency'
import { useSeo } from '@/lib/useSeo'

export function Dashboard() {
  useSeo('My Account')
  const { user } = useAuth()
  const { productIds } = useWishlist()

  if (!user) return null

  const stats = [
    { label: 'Orders Placed', value: user.orders.length },
    { label: 'Saved Addresses', value: user.addresses.length },
    { label: 'Wishlist Items', value: productIds.length },
  ]

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-beige-dark p-6 text-center">
            <p className="font-display text-3xl text-champagne-700">{stat.value}</p>
            <p className="mt-1 text-xs uppercase tracking-widest2 text-charcoal-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg text-charcoal">Recent Orders</h2>
          <Link to="/account/orders" className="btn-ghost">
            View All
          </Link>
        </div>
        {user.orders.length === 0 ? (
          <p className="text-sm text-charcoal-muted">You haven&rsquo;t placed any orders yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-beige border-y border-beige">
            {user.orders.slice(0, 3).map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-4">
                <div>
                  <p className="text-sm text-charcoal">{order.id}</p>
                  <p className="text-xs text-charcoal-muted">{new Date(order.date).toLocaleDateString()}</p>
                </div>
                <span className="text-xs uppercase tracking-wide text-champagne-700">{order.status}</span>
                <p className="text-sm text-charcoal">{formatPKR(order.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
