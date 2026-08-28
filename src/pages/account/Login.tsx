import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useSeo } from '@/lib/useSeo'
import { siteConfig } from '@/config/site'

export function Login() {
  useSeo('Sign In')
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) return <Navigate to="/account/dashboard" replace />

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = login(email, password)
    if (result.ok) {
      navigate('/account/dashboard')
    } else {
      setError(result.error ?? 'Something went wrong.')
    }
  }

  return (
    <div className="container-lux flex justify-center py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <span className="eyebrow">Welcome Back</span>
        <h1 className="mt-3 text-3xl text-charcoal">Sign In</h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary mt-2">
            Sign In
          </button>
        </form>

        <p className="mt-6 text-sm text-charcoal-muted">
          New to {siteConfig.brandName}? <Link to="/account/register" className="text-charcoal underline hover:text-champagne-700">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
