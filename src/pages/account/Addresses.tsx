import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { Address } from '@/types'
import { useSeo } from '@/lib/useSeo'
import { PlusIcon, TrashIcon } from '@/components/ui/Icons'

const emptyForm = { label: '', fullName: '', phone: '', addressLine: '', city: '', area: '', postalCode: '' }

export function Addresses() {
  useSeo('My Addresses')
  const { user, addAddress, removeAddress, setDefaultAddress } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  if (!user) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addAddress(form as Omit<Address, 'id'>)
    setForm(emptyForm)
    setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-8">
      {user.addresses.length === 0 && !showForm && <p className="text-charcoal-muted">No saved addresses yet.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {user.addresses.map((address) => (
          <div key={address.id} className="relative border border-beige-dark p-5">
            {address.isDefault && (
              <span className="absolute right-4 top-4 text-[10px] uppercase tracking-widest2 text-champagne-700">Default</span>
            )}
            <p className="text-charcoal">{address.label || 'Address'}</p>
            <p className="mt-1 text-sm text-charcoal-soft">{address.fullName}</p>
            <p className="text-sm text-charcoal-soft">{address.phone}</p>
            <p className="mt-1 text-sm text-charcoal-muted">
              {address.addressLine}, {address.area}, {address.city} {address.postalCode}
            </p>
            <div className="mt-4 flex gap-4">
              {!address.isDefault && (
                <button type="button" onClick={() => setDefaultAddress(address.id)} className="text-xs uppercase tracking-wide text-champagne-700 hover:underline">
                  Set as Default
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAddress(address.id)}
                className="flex items-center gap-1 text-xs uppercase tracking-wide text-charcoal-muted hover:text-charcoal"
              >
                <TrashIcon width={13} height={13} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 border border-beige-dark p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input placeholder="Label (e.g. Home)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input-field" />
            <input
              required
              placeholder="Full Name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="input-field"
            />
            <input
              required
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field sm:col-span-2"
            />
            <input
              required
              placeholder="Address"
              value={form.addressLine}
              onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
              className="input-field sm:col-span-2"
            />
            <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" />
            <input required placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="input-field" />
            <input
              required
              placeholder="Postal Code"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">
              Save Address
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)} className="btn-secondary self-start flex items-center gap-2">
          <PlusIcon /> Add New Address
        </button>
      )}
    </div>
  )
}
