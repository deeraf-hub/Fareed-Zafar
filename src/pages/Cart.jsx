import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { formatPKR } from '../lib/format.js'
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx'
import CartItemRow from '../components/cart/CartItemRow.jsx'

export default function Cart() {
  const { items, subtotal } = useCart()

  useEffect(() => {
    document.title = 'Your Cart | Hand Tools Trading Corporation'
  }, [])

  return (
    <>
      <Breadcrumbs items={[{ label: 'Cart' }]} />

      <div className="container-app py-8 md:py-12">
        <h1 className="mb-8 font-heading text-2xl font-bold text-navy-900 md:text-3xl">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-steel-200 bg-white px-6 py-20 text-center">
            <ShoppingBag size={48} className="text-steel-300" />
            <h2 className="font-heading text-lg font-semibold text-navy-900">Your cart is empty</h2>
            <p className="max-w-sm text-sm text-steel-500">
              Looks like you haven&apos;t added any tools yet. Browse our shop to find what you need.
            </p>
            <Link
              to="/shop"
              className="mt-2 rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600"
            >
              Shop Tools
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 divide-y divide-steel-100 rounded-lg border border-steel-100 bg-white px-5">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>

            <div className="w-full shrink-0 lg:w-80">
              <div className="sticky top-24 rounded-lg border border-steel-100 bg-white p-5">
                <h2 className="mb-4 font-heading text-base font-bold text-navy-900">Order Summary</h2>
                <div className="space-y-2 border-b border-steel-100 pb-4 text-sm">
                  <div className="flex justify-between text-steel-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-navy-900">{formatPKR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-steel-600">
                    <span>Delivery</span>
                    <span className="font-medium text-navy-900">Calculated at order</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-4">
                  <span className="font-heading text-base font-bold text-navy-900">Total</span>
                  <span className="font-heading text-xl font-bold text-navy-900">{formatPKR(subtotal)}</span>
                </div>
                <Link
                  to="/checkout"
                  className="block w-full rounded-md bg-accent-500 py-3 text-center text-sm font-semibold text-white hover:bg-accent-600"
                >
                  Proceed to Order
                </Link>
                <Link
                  to="/shop"
                  className="mt-3 block w-full rounded-md border border-navy-800 py-3 text-center text-sm font-semibold text-navy-800 hover:bg-navy-800 hover:text-white"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
