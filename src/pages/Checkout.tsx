import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { getProductBySlug, products } from '@/data/products'
import { formatPKR } from '@/lib/currency'
import { PlaceholderArt } from '@/lib/placeholderArt'
import { useSeo } from '@/lib/useSeo'
import { siteConfig } from '@/config/site'

type PaymentMethod = 'cod' | 'bank-transfer' | 'easypaisa' | 'jazzcash' | 'card'

const paymentMethods: { id: PaymentMethod; label: string; note: string }[] = [
  { id: 'cod', label: 'Cash on Delivery', note: 'Pay in cash when your order arrives.' },
  { id: 'bank-transfer', label: 'Bank Transfer', note: 'Bank details will be emailed after you place your order.' },
  { id: 'easypaisa', label: 'Easypaisa', note: 'Gateway integration coming soon — orders placed with this method will be confirmed manually.' },
  { id: 'jazzcash', label: 'JazzCash', note: 'Gateway integration coming soon — orders placed with this method will be confirmed manually.' },
  { id: 'card', label: 'Card Payment', note: 'Secure card checkout is being integrated. Card details are not collected on this demo site.' },
]

export function Checkout() {
  useSeo('Checkout')
  const { lines, subtotal, deliveryFee, total, clearCart } = useCart()
  const { isAuthenticated, user, placeOrder } = useAuth()

  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    address: '',
    city: '',
    area: '',
    postalCode: '',
  })
  const [payment, setPayment] = useState<PaymentMethod>('cod')
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null)

  const lineItems = lines
    .map((line) => ({ line, product: products.find((p) => p.id === line.productId) ?? getProductBySlug(line.productId) }))
    .filter((entry): entry is { line: typeof lines[number]; product: NonNullable<typeof entry.product> } => Boolean(entry.product))

  if (lineItems.length === 0 && !confirmedOrderId) {
    return <Navigate to="/cart" replace />
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const paymentLabel = paymentMethods.find((p) => p.id === payment)?.label ?? payment
    const orderInput = {
      items: lineItems.map(({ line, product }) => ({
        productId: product.id,
        name: product.name,
        quantity: line.quantity,
        price: product.price,
      })),
      total,
      deliveryFee,
      paymentMethod: paymentLabel,
      address: {
        fullName: form.fullName,
        phone: form.phone,
        addressLine: form.address,
        city: form.city,
        area: form.area,
        postalCode: form.postalCode,
      },
    }

    if (isAuthenticated) {
      const order = placeOrder(orderInput)
      setConfirmedOrderId(order.id)
    } else {
      setConfirmedOrderId(`SW-${Math.floor(100000 + Math.random() * 900000)}`)
    }
    clearCart()
  }

  if (confirmedOrderId) {
    return (
      <div className="container-lux flex flex-col items-center gap-5 py-28 text-center">
        <span className="eyebrow">Order Confirmed</span>
        <h1 className="text-3xl text-charcoal sm:text-4xl">Thank you, your order is on its way to being prepared.</h1>
        <p className="text-charcoal-muted">
          Order reference <strong className="text-charcoal">{confirmedOrderId}</strong>. A confirmation has been sent to{' '}
          {form.email || 'your email'}.
        </p>
        <div className="mt-4 flex gap-4">
          <Link to="/shop" className="btn-primary">
            Continue Shopping
          </Link>
          {isAuthenticated && (
            <Link to="/account/orders" className="btn-secondary">
              View Order
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container-lux py-12 sm:py-16">
      <h1 className="mb-10 text-3xl sm:text-4xl text-charcoal">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="mb-4 text-lg text-charcoal">Customer Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input
                required
                placeholder="Full Name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="input-field sm:col-span-2"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
              />
              <input
                required
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg text-charcoal">Delivery Address</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input
                required
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input-field sm:col-span-2"
              />
              <input
                required
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="input-field"
              />
              <input
                required
                placeholder="Area"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="input-field"
              />
              <input
                required
                placeholder="Postal Code"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                className="input-field"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg text-charcoal">Payment Method</h2>
            <div className="flex flex-col gap-3">
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer flex-col gap-1 border p-4 transition-colors ${
                    payment === method.id ? 'border-champagne-600 bg-champagne-50' : 'border-beige-dark'
                  }`}
                >
                  <span className="flex items-center gap-3 text-sm text-charcoal">
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === method.id}
                      onChange={() => setPayment(method.id)}
                      className="accent-champagne-600"
                    />
                    {method.label}
                  </span>
                  <span className="pl-6 text-xs text-charcoal-muted">{method.note}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="h-fit bg-cream/60 p-7">
          <h2 className="mb-5 text-lg text-charcoal">Order Summary</h2>
          <div className="flex flex-col gap-4 divide-y divide-beige">
            {lineItems.map(({ line, product }) => (
              <div key={product.id} className="flex items-center gap-3 pt-4 first:pt-0">
                <div className="relative h-14 w-12 flex-none overflow-hidden">
                  <PlaceholderArt scene={product.images[0]} className="h-full w-full" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-[10px] text-ivory">
                    {line.quantity}
                  </span>
                </div>
                <p className="flex-1 text-sm text-charcoal">{product.name}</p>
                <p className="text-sm text-charcoal-soft">{formatPKR(product.price * line.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-beige-dark pt-5 text-sm text-charcoal-soft">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPKR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{deliveryFee === 0 ? 'Complimentary' : formatPKR(deliveryFee)}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-beige-dark pt-4 text-base text-charcoal">
            <span>Grand Total</span>
            <span>{formatPKR(total)}</span>
          </div>

          <button type="submit" className="btn-primary mt-6 w-full">
            Place Order
          </button>
          {!isAuthenticated && (
            <p className="mt-3 text-center text-xs text-charcoal-muted">
              Checking out as a guest. <Link to="/account/login" className="underline hover:text-champagne-700">Sign in</Link> to save this order to your account.
            </p>
          )}
          <p className="mt-4 text-center text-[11px] text-charcoal-muted">{siteConfig.contact.addressShort}</p>
        </div>
      </form>
    </div>
  )
}
