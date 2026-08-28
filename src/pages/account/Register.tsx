import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useSeo } from '@/lib/useSeo'

export function Register() {
  useSeo('Create Account')
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) return <Navigate to="/account/dashboard" replace />

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    const result = register(form)
    if (result.ok) {
      navigate('/account/dashboard')
    } else {
      setError(result.error ?? 'Something went wrong.')
    }
  }

  return (
    <div className="container-lux flex justify-center py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <span className="eyebrow">Join Us</span>
        <h1 className="mt-3 text-3xl text-charcoal">Create Account</h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <input
            required
            placeholder="Full Name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="input-field"
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
          <input
            required
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input-field"
          />
          <input
            required
            type="password"
            placeholder="Confirm Password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="input-field"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary mt-2">
            Create Account
          </button>
        </form>

        <p className="mt-6 text-sm text-charcoal-muted">
          Already have an account? <Link to="/account/login" className="text-charcoal underline hover:text-champagne-700">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
