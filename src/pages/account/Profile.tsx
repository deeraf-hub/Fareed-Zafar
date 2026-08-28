import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useSeo } from '@/lib/useSeo'

export function Profile() {
  useSeo('My Profile')
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ fullName: user?.fullName ?? '', phone: user?.phone ?? '' })
  const [saved, setSaved] = useState(false)

  if (!user) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile(form)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-widest2 text-charcoal-muted">Full Name</label>
        <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-widest2 text-charcoal-muted">Email</label>
        <input value={user.email} disabled className="input-field opacity-60" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-widest2 text-charcoal-muted">Phone Number</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
      </div>
      <button type="submit" className="btn-primary self-start">
        Save Changes
      </button>
      {saved && <p className="text-sm text-champagne-700">Profile updated.</p>}
    </form>
  )
}
