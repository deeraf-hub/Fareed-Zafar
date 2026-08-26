import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from '@/context/AccountContext'
import { useWishlist } from '@/context/WishlistContext'
import { useToast } from '@/context/ToastContext'
import type { Address, Order } from '@/types'
import { formatDate, formatPrice } from '@/lib/format'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, ButtonLink } from '@/components/ui/Button'
import { CheckIcon } from '@/components/ui/icons'

const ORDER_STEPS: Order['status'][] = ['Processing', 'Packed', 'Dispatched', 'Delivered']

function AuthPanel() {
  const { login, register, requestPasswordReset } = useAccount()
  const { notify } = useToast()
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' })

  const update = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (mode === 'reset') {
      const result = requestPasswordReset(form.email)
      if (result.ok) setMessage(result.message)
      else setError(result.message)
      return
    }

    const result =
      mode === 'login'
        ? login(form.email, form.password)
        : register({
            fullName: form.fullName,
            email: form.email,
            password: form.password,
            phone: form.phone,
          })

    if (!result.ok) {
      setError(result.error ?? 'Something went wrong. Please try again.')
      return
    }
    notify(mode === 'login' ? 'Welcome back' : 'Your account has been created')
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="flex border-b border-linen">
        {(['login', 'register'] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => {
              setMode(entry)
              setError(null)
              setMessage(null)
            }}
            className={`flex-1 pb-4 text-[11px] uppercase tracking-wideish transition-colors ${
              mode === entry
                ? 'border-b-2 border-navy-700 text-navy-700'
                : 'text-stoneish hover:text-navy-700'
            }`}
          >
            {entry === 'login' ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5">
        {mode === 'register' && (
          <div>
            <label htmlFor="fullName" className="text-[11px] uppercase tracking-wideish text-stoneish">
              Full Name
            </label>
            <input
              id="fullName"
              value={form.fullName}
              onChange={update('fullName')}
              autoComplete="name"
              className="field mt-2"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="text-[11px] uppercase tracking-wideish text-stoneish">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
            className="field mt-2"
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <label
              htmlFor="password"
              className="text-[11px] uppercase tracking-wideish text-stoneish"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="field mt-2"
            />
          </div>
        )}

        {mode === 'register' && (
          <div>
            <label htmlFor="phone" className="text-[11px] uppercase tracking-wideish text-stoneish">
              Phone <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="phone"
              value={form.phone}
              onChange={update('phone')}
              autoComplete="tel"
              className="field mt-2"
            />
          </div>
        )}

        {error && <p className="text-xs text-champagne-700">{error}</p>}
        {message && <p className="text-xs text-champagne-700">{message}</p>}

        <Button type="submit" size="lg" fullWidth>
          {mode === 'login' ? 'Login' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'reset' ? 'login' : 'reset')
          setError(null)
          setMessage(null)
        }}
        className="link-underline mt-6 block text-center text-xs text-stoneish"
      >
        {mode === 'reset' ? 'Back to login' : 'Forgot your password?'}
      </button>

      <p className="mt-8 text-center text-xs leading-relaxed text-stoneish">
        Accounts are stored on this device for the demo. Connect an authentication service to make
        them permanent.
      </p>
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const stepIndex = ORDER_STEPS.indexOf(order.status)
  return (
    <li className="border border-linen bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-display text-xl">{order.id}</p>
          <p className="mt-1 text-xs text-stoneish">{formatDate(order.placedAt)}</p>
        </div>
        <p className="text-sm text-navy-700">{formatPrice(order.total)}</p>
      </div>

      <ol className="mt-6 flex items-center gap-2">
        {ORDER_STEPS.map((step, index) => (
          <li key={step} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${
                index <= stepIndex
                  ? 'border-champagne-500 bg-champagne-500 text-white'
                  : 'border-linen text-stoneish'
              }`}
            >
              {index <= stepIndex ? <CheckIcon width={12} height={12} /> : index + 1}
            </span>
            <span
              className={`hidden text-[10px] uppercase tracking-wideish sm:block ${
                index <= stepIndex ? 'text-navy-700' : 'text-stoneish'
              }`}
            >
              {step}
            </span>
            {index < ORDER_STEPS.length - 1 && (
              <span
                className={`h-px flex-1 ${index < stepIndex ? 'bg-champagne-400' : 'bg-linen'}`}
              />
            )}
          </li>
        ))}
      </ol>

      <ul className="mt-6 divide-y divide-linen border-t border-linen">
        {order.lines.map((line) => (
          <li key={line.productId} className="flex justify-between gap-4 py-3 text-sm">
            <Link to={`/product/${line.slug}`} className="link-underline text-navy-700">
              {line.name} × {line.quantity}
            </Link>
            <span className="text-stoneish">{formatPrice(line.price * line.quantity)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-stoneish">
        {order.paymentMethod} · {order.address.line1}, {order.address.area}, {order.address.city}
      </p>
    </li>
  )
}

function AddressBook() {
  const { addresses, saveAddress, removeAddress, setDefaultAddress } = useAccount()
  const { notify } = useToast()
  const [draft, setDraft] = useState<Omit<Address, 'id'>>({
    label: 'Home',
    fullName: '',
    phone: '',
    line1: '',
    area: '',
    city: '',
    postalCode: '',
    isDefault: addresses.length === 0,
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.fullName || !draft.line1 || !draft.city) return
    saveAddress(draft)
    notify('Address saved')
    setDraft({
      label: 'Home',
      fullName: '',
      phone: '',
      line1: '',
      area: '',
      city: '',
      postalCode: '',
      isDefault: false,
    })
  }

  const fields: { key: keyof Omit<Address, 'id' | 'isDefault'>; label: string }[] = [
    { key: 'label', label: 'Label' },
    { key: 'fullName', label: 'Full Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'line1', label: 'Address' },
    { key: 'area', label: 'Area' },
    { key: 'city', label: 'City' },
    { key: 'postalCode', label: 'Postal Code' },
  ]

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <h2 className="text-xl">Saved Addresses</h2>
        {addresses.length === 0 ? (
          <p className="mt-4 text-sm text-stoneish">No addresses saved yet.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {addresses.map((address) => (
              <li key={address.id} className="border border-linen bg-white p-5 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wideish text-champagne-600">
                    {address.label}
                    {address.isDefault && ' · Default'}
                  </p>
                  <div className="flex gap-3 text-xs">
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => setDefaultAddress(address.id)}
                        className="link-underline text-stoneish"
                      >
                        Make default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAddress(address.id)}
                      className="link-underline text-stoneish"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-navy-700">{address.fullName}</p>
                <p className="text-stoneish">
                  {address.line1}, {address.area}
                  <br />
                  {address.city} {address.postalCode}
                </p>
                <p className="mt-1 text-stoneish">{address.phone}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onSubmit}>
        <h2 className="text-xl">Add an Address</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className={field.key === 'line1' ? 'sm:col-span-2' : ''}>
              <label
                htmlFor={`address-${field.key}`}
                className="text-[11px] uppercase tracking-wideish text-stoneish"
              >
                {field.label}
              </label>
              <input
                id={`address-${field.key}`}
                value={draft[field.key]}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                className="field mt-2"
              />
            </div>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm text-stoneish">
          <input
            type="checkbox"
            checked={Boolean(draft.isDefault)}
            onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })}
            className="h-4 w-4 accent-navy-700"
          />
          Set as default delivery address
        </label>
        <Button type="submit" className="mt-6">
          Save Address
        </Button>
      </form>
    </div>
  )
}

export default function Account() {
  const { customer, isAuthenticated, orders, logout, updateProfile } = useAccount()
  const wishlist = useWishlist()
  const { notify } = useToast()
  const [tab, setTab] = useState<'orders' | 'profile' | 'addresses'>('orders')
  const [profile, setProfile] = useState({
    fullName: customer?.fullName ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
  })

  return (
    <>
      <Seo title="My Account" noIndex />
      <PageHeader
        eyebrow={isAuthenticated ? `Welcome, ${customer?.fullName}` : 'Account'}
        title={isAuthenticated ? 'My Account' : 'Login or Register'}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Account' }]}
      />

      <div className="container-luxe py-12 lg:py-16">
        {!isAuthenticated ? (
          <AuthPanel />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
            <nav aria-label="Account">
              <ul className="flex gap-4 overflow-x-auto border-b border-linen pb-4 text-[11px] uppercase tracking-wideish lg:flex-col lg:gap-3 lg:border-b-0 lg:pb-0">
                {(
                  [
                    ['orders', `Orders (${orders.length})`],
                    ['profile', 'Profile'],
                    ['addresses', 'Addresses'],
                  ] as const
                ).map(([key, label]) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setTab(key)}
                      className={`whitespace-nowrap transition-colors ${
                        tab === key ? 'text-champagne-700' : 'text-navy-700 hover:text-champagne-700'
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
                <li>
                  <Link to="/wishlist" className="whitespace-nowrap text-navy-700 hover:text-champagne-700">
                    Wishlist ({wishlist.count})
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      notify('You have been logged out')
                    }}
                    className="whitespace-nowrap text-stoneish hover:text-navy-700"
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </nav>

            <div>
              {tab === 'orders' && (
                <>
                  <h2 className="text-xl">Order History</h2>
                  {orders.length === 0 ? (
                    <div className="mt-6 border border-linen bg-white p-10 text-center">
                      <p className="text-sm text-stoneish">You have not placed an order yet.</p>
                      <ButtonLink to="/shop" className="mt-6">
                        Start Shopping
                      </ButtonLink>
                    </div>
                  ) : (
                    <ul className="mt-6 space-y-6">
                      {orders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </ul>
                  )}
                </>
              )}

              {tab === 'profile' && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    updateProfile(profile)
                    notify('Profile updated')
                  }}
                  className="max-w-md"
                >
                  <h2 className="text-xl">Profile</h2>
                  <div className="mt-6 grid gap-5">
                    {(
                      [
                        ['fullName', 'Full Name'],
                        ['email', 'Email'],
                        ['phone', 'Phone'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <label
                          htmlFor={`profile-${key}`}
                          className="text-[11px] uppercase tracking-wideish text-stoneish"
                        >
                          {label}
                        </label>
                        <input
                          id={`profile-${key}`}
                          value={profile[key]}
                          onChange={(event) => setProfile({ ...profile, [key]: event.target.value })}
                          className="field mt-2"
                        />
                      </div>
                    ))}
                  </div>
                  <Button type="submit" className="mt-6">
                    Save Changes
                  </Button>
                </form>
              )}

              {tab === 'addresses' && <AddressBook />}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
