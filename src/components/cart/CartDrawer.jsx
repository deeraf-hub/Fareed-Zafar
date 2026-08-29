import { Link } from 'react-router-dom'
import { ShoppingBag, X } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'
import { formatPKR } from '../../lib/format.js'
import CartItemRow from './CartItemRow.jsx'

export default function CartDrawer() {
  const { items, subtotal, isCartOpen, setCartOpen } = useCart()

  if (!isCartOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button
        className="absolute inset-0 bg-navy-950/60"
        aria-label="Close cart"
        onClick={() => setCartOpen(false)}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
          <h2 className="font-heading text-lg font-bold text-navy-900">Your Cart ({items.length})</h2>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
            className="text-steel-500 hover:text-navy-900"
          >
            <X size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag size={44} className="text-steel-300" />
            <h3 className="font-heading text-base font-semibold text-navy-900">Your cart is empty</h3>
            <p className="text-sm text-steel-500">Browse our tools and add items to get started.</p>
            <Link
              to="/shop"
              onClick={() => setCartOpen(false)}
              className="mt-2 rounded-md bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
            >
              Shop Tools
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-steel-100 overflow-y-auto thin-scrollbar px-5">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>
            <div className="border-t border-steel-100 bg-steel-50 p-5">
              <div className="mb-4 flex items-center justify-between text-sm font-medium text-steel-700">
                <span>Subtotal</span>
                <span className="font-heading text-lg font-bold text-navy-900">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  to="/checkout"
                  onClick={() => setCartOpen(false)}
                  className="w-full rounded-md bg-accent-500 py-3 text-center text-sm font-semibold text-white hover:bg-accent-600"
                >
                  Proceed to Order
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setCartOpen(false)}
                  className="w-full rounded-md border border-navy-800 py-3 text-center text-sm font-semibold text-navy-800 hover:bg-navy-800 hover:text-white"
                >
                  View Cart
                </Link>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="w-full py-2 text-center text-sm font-medium text-steel-500 hover:text-navy-900"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
