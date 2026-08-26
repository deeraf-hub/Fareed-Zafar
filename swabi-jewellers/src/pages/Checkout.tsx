import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import { useAccount } from '@/context/AccountContext'
import { siteConfig, type PaymentMethodId } from '@/config/site'
import { formatPrice } from '@/lib/format'
import type { Order } from '@/types'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { Button } from '@/components/ui/Button'

interface FormValues {
  fullName: string
  email: string
  phone: string
  line1: string
  area: string
  city: string
  postalCode: string
  notes: string
}

const EMPTY: FormValues = {
  fullName: '',
  email: '',
  phone: '',
  line1: '',
  area: '',
  city: '',
  postalCode: '',
  notes: '',
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  required = true,
  placeholder,
  autoComplete,
}: {
  id: keyof FormValues
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  required?: boolean
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[11px] uppercase tracking-wideish text-stoneish">
        {label}
        {!required && <span className="normal-case tracking-normal"> (optional)</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`field mt-2 ${error ? 'border-champagne-600' : ''}`}
      />
      {error && <p className="mt-1.5 text-xs text-champagne-700">{error}</p>}
    </div>
  )
}

export default function Checkout() {
  const { entries, subtotal, discount, deliveryFee, total, clearCart, promo } = useCart()
  const { customer, addOrder, addresses } = useAccount()
  const navigate = useNavigate()

  const defaultAddress = addresses.find((entry) => entry.isDefault) ?? addresses[0]
  const [values, setValues] = useState<FormValues>({
    ...EMPTY,
    fullName: customer?.fullName ?? defaultAddress?.fullName ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? defaultAddress?.phone ?? '',
    line1: defaultAddress?.line1 ?? '',
    area: defaultAddress?.area ?? '',
    city: defaultAddress?.city ?? '',
    postalCode: defaultAddress?.postalCode ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [payment, setPayment] = useState<PaymentMethodId>('cod')
  const [submitting, setSubmitting] = useState(false)

  if (entries.length === 0) return <Navigate to="/cart" replace />

  const set = (key: keyof FormValues) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const validate = () => {
    const next: Partial<Record<keyof FormValues, string>> = {}
    if (values.fullName.trim().length < 3) next.fullName = 'Please enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = 'Please enter a valid email address.'
    if (!/^[0-9+\-\s]{10,15}$/.test(values.phone)) next.phone = 'Please enter a valid phone number.'
    if (values.line1.trim().length < 6) next.line1 = 'Please enter your street address.'
    if (!values.area.trim()) next.area = 'Please enter your area or town.'
    if (!values.city.trim()) next.city = 'Please enter your city.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const method = siteConfig.paymentMethods.find((entry) => entry.id === payment)
    const order: Order = {
      id: `SJ-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      placedAt: new Date().toISOString(),
      status: 'Processing',
      lines: entries.map((entry) => ({
        productId: entry.productId,
        name: entry.product.name,
        slug: entry.product.slug,
        price: entry.product.price,
        quantity: entry.quantity,
      })),
      subtotal,
      discount,
      deliveryFee,
      total,
      paymentMethod: method?.label ?? 'Cash on Delivery',
      customer: { fullName: values.fullName, email: values.email, phone: values.phone },
      address: {
        line1: values.line1,
        area: values.area,
        city: values.city,
        postalCode: values.postalCode,
      },
    }

    // A real integration posts this to `/api/orders` and hands off to the payment gateway.
    addOrder(order)
    clearCart()
    navigate(`/order/${order.id}`, { replace: true })
  }

  return (
    <>
      <Seo title="Checkout" noIndex />
      <PageHeader
        eyebrow="Almost there"
        title="Checkout"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Bag', to: '/cart' }, { label: 'Checkout' }]}
      />

      <div className="container-luxe py-12 lg:py-16">
        <form onSubmit={onSubmit} className="grid gap-12 lg:grid-cols-[1fr_23rem] lg:gap-16">
          <div className="space-y-12">
            <section>
              <h2 className="text-xl">Customer Information</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field
                  id="fullName"
                  label="Full Name"
                  value={values.fullName}
                  onChange={set('fullName')}
                  error={errors.fullName}
                  autoComplete="name"
                />
                <Field
                  id="phone"
                  label="Phone Number"
                  value={values.phone}
                  onChange={set('phone')}
                  error={errors.phone}
                  placeholder="03XX-XXXXXXX"
                  autoComplete="tel"
                />
                <div className="sm:col-span-2">
                  <Field
                    id="email"
                    label="Email"
                    type="email"
                    value={values.email}
                    onChange={set('email')}
                    error={errors.email}
                    autoComplete="email"
                  />
                </div>
              </div>
              {!customer && (
                <p className="mt-4 text-xs text-stoneish">
                  Already have an account?{' '}
                  <Link to="/account" className="link-underline text-navy-700">
                    Log in
                  </Link>{' '}
                  to fill this in automatically.
                </p>
              )}
            </section>

            <section>
              <h2 className="text-xl">Delivery Address</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field
                    id="line1"
                    label="Address"
                    value={values.line1}
                    onChange={set('line1')}
                    error={errors.line1}
                    placeholder="House / flat, street"
                    autoComplete="address-line1"
                  />
                </div>
                <Field
                  id="area"
                  label="Area"
                  value={values.area}
                  onChange={set('area')}
                  error={errors.area}
                  autoComplete="address-level3"
                />
                <Field
                  id="city"
                  label="City"
                  value={values.city}
                  onChange={set('city')}
                  error={errors.city}
                  autoComplete="address-level2"
                />
                <Field
                  id="postalCode"
                  label="Postal Code"
                  value={values.postalCode}
                  onChange={set('postalCode')}
                  required={false}
                  autoComplete="postal-code"
                />
                <div className="sm:col-span-2">
                  <label
                    htmlFor="notes"
                    className="text-[11px] uppercase tracking-wideish text-stoneish"
                  >
                    Delivery notes <span className="normal-case tracking-normal">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={values.notes}
                    onChange={(event) => set('notes')(event.target.value)}
                    className="field mt-2 resize-none"
                    placeholder="Landmark, preferred delivery time…"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl">Payment</h2>
              <ul className="mt-6 space-y-3">
                {siteConfig.paymentMethods.map((method) => (
                  <li key={method.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                        payment === method.id ? 'border-navy-700 bg-white' : 'border-linen'
                      } ${method.enabled ? '' : 'cursor-not-allowed opacity-50'}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={payment === method.id}
                        disabled={!method.enabled}
                        onChange={() => setPayment(method.id)}
                        className="mt-0.5 h-4 w-4 accent-navy-700"
                      />
                      <span>
                        <span className="block text-sm text-navy-700">{method.label}</span>
                        <span className="block text-xs text-stoneish">{method.note}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-stoneish">
                Payment gateways are not connected in this demo — placing an order records it locally
                so the full journey can be reviewed.
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-32 lg:h-fit">
            <div className="border border-linen bg-white p-7">
              <h2 className="text-xl">Order Summary</h2>
              <ul className="mt-6 space-y-4 border-b border-linen pb-6">
                {entries.map((entry) => (
                  <li key={entry.productId} className="flex gap-3">
                    <span className="w-14 shrink-0">
                      <SmartImage
                        image={entry.product.images[0]}
                        ratio="aspect-[4/5]"
                        width={160}
                        height={200}
                        sizes="56px"
                      />
                    </span>
                    <span className="flex-1 text-sm">
                      <span className="block text-navy-700">{entry.product.name}</span>
                      <span className="block text-xs text-stoneish">Qty {entry.quantity}</span>
                    </span>
                    <span className="text-sm text-navy-700">{formatPrice(entry.lineTotal)}</span>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stoneish">Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-champagne-700">
                    <dt>Discount {promo ? `(${promo.code})` : ''}</dt>
                    <dd>− {formatPrice(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-stoneish">Delivery Fee</dt>
                  <dd>{deliveryFee === 0 ? 'Complimentary' : formatPrice(deliveryFee)}</dd>
                </div>
                <div className="flex justify-between border-t border-linen pt-4 text-base">
                  <dt>Grand Total</dt>
                  <dd className="font-medium">{formatPrice(total)}</dd>
                </div>
              </dl>

              <Button type="submit" fullWidth size="lg" className="mt-7" disabled={submitting}>
                {submitting ? 'Placing Order…' : 'Place Order'}
              </Button>
              <p className="mt-4 text-center text-xs text-stoneish">
                {siteConfig.commerce.dispatchCopy}
              </p>
            </div>
          </aside>
        </form>
      </div>
    </>
  )
}
