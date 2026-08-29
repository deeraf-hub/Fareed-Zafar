import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Banknote, Smartphone, Wallet } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { formatPKR } from '../lib/format.js'
import { BUSINESS } from '../data/business.js'
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx'

const PAYMENT_METHODS = [
  {
    id: 'cod',
    label: 'Cash on Delivery',
    icon: Banknote,
    description: 'Pay in cash when your order is delivered to your address.',
  },
  {
    id: 'jazzcash',
    label: 'JazzCash',
    icon: Smartphone,
    description: 'We will share our JazzCash number to confirm your payment after ordering.',
  },
  {
    id: 'easypaisa',
    label: 'EasyPaisa',
    icon: Wallet,
    description: 'We will share our EasyPaisa number to confirm your payment after ordering.',
  },
]

const emptyForm = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  notes: '',
  payment: 'cod',
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    document.title = 'Checkout | Hand Tools Trading Corporation'
  }, [])

  if (items.length === 0) {
    return <Navigate to="/cart" replace />
  }

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const next = {}
    if (!form.fullName.trim()) next.fullName = 'Full name is required'
    if (!/^[0-9+\s-]{7,}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number'
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email'
    if (!form.address.trim()) next.address = 'Delivery address is required'
    if (!form.city.trim()) next.city = 'City is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const order = {
      ...form,
      items,
      total: subtotal,
      orderId: `HTT-${Date.now().toString().slice(-8)}`,
      placedAt: new Date().toISOString(),
    }

    navigate('/order-success', { state: { order } })
    clearCart()
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <div className="container-app py-8 md:py-12">
        <h1 className="mb-2 font-heading text-2xl font-bold text-navy-900 md:text-3xl">Checkout</h1>
        <p className="mb-8 max-w-xl text-sm text-steel-500">
          Fill in your details below to place your order request. Our team will contact you to
          confirm delivery and payment.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="rounded-lg border border-steel-100 bg-white p-5 md:p-6">
              <h2 className="mb-4 font-heading text-base font-bold text-navy-900">Contact & Delivery Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full Name" error={errors.fullName}>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={handleChange('fullName')}
                    className="input"
                    placeholder="e.g. Ahmed Raza"
                  />
                </Field>
                <Field label="Phone Number" error={errors.phone}>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    className="input"
                    placeholder="03XX XXXXXXX"
                  />
                </Field>
                <Field label="Email (optional)" error={errors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    className="input"
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="City" error={errors.city}>
                  <input
                    type="text"
                    value={form.city}
                    onChange={handleChange('city')}
                    className="input"
                    placeholder="e.g. Lahore"
                  />
                </Field>
                <Field label="Delivery Address" error={errors.address} full>
                  <textarea
                    value={form.address}
                    onChange={handleChange('address')}
                    rows={3}
                    className="input resize-none"
                    placeholder="House / Street / Area details"
                  />
                </Field>
                <Field label="Additional Notes (optional)" full>
                  <textarea
                    value={form.notes}
                    onChange={handleChange('notes')}
                    rows={2}
                    className="input resize-none"
                    placeholder="Any special instructions for your order"
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-lg border border-steel-100 bg-white p-5 md:p-6">
              <h2 className="mb-4 font-heading text-base font-bold text-navy-900">Payment Method</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon, description }) => (
                  <label
                    key={id}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      form.payment === id
                        ? 'border-accent-500 bg-accent-100/40 ring-1 ring-accent-500'
                        : 'border-steel-200 hover:border-steel-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={id}
                      checked={form.payment === id}
                      onChange={handleChange('payment')}
                      className="sr-only"
                    />
                    <Icon size={20} className="mb-2 text-navy-800" />
                    <p className="text-sm font-semibold text-navy-900">{label}</p>
                    <p className="mt-1 text-xs text-steel-500">{description}</p>
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs text-steel-500">
                This is an order request &mdash; no online payment is processed on this website. For
                JazzCash or EasyPaisa, our team will send our account number by phone/WhatsApp after
                you place the order so you can confirm payment.
              </p>
            </div>
          </div>

          <div>
            <div className="sticky top-24 rounded-lg border border-steel-100 bg-white p-5 md:p-6">
              <h2 className="mb-4 font-heading text-base font-bold text-navy-900">Order Summary</h2>
              <div className="max-h-72 space-y-3 overflow-y-auto thin-scrollbar pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-steel-600">
                      {item.name} <span className="text-steel-400">× {item.quantity}</span>
                    </span>
                    <span className="font-medium text-navy-900">{formatPKR(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-steel-100 pt-4">
                <span className="font-heading text-base font-bold text-navy-900">Order Total</span>
                <span className="font-heading text-xl font-bold text-navy-900">{formatPKR(subtotal)}</span>
              </div>
              <button
                type="submit"
                className="mt-5 w-full rounded-md bg-accent-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
              >
                Place Order
              </button>
              <Link
                to="/cart"
                className="mt-3 block text-center text-xs font-medium text-steel-500 hover:text-navy-900"
              >
                ← Back to Cart
              </Link>
              <p className="mt-4 text-center text-xs text-steel-400">
                Questions? Call {BUSINESS.phoneDisplay}
              </p>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}

function Field({ label, error, full, children }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1.5 block text-sm font-medium text-navy-800">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
