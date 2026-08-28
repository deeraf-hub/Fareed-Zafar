import { Link } from 'react-router-dom'
import { useSeo } from '@/lib/useSeo'

export function NotFound() {
  useSeo('Page Not Found')

  return (
    <div className="container-lux flex flex-col items-center gap-5 py-32 text-center">
      <span className="font-display text-6xl text-champagne-500">404</span>
      <h1 className="text-2xl text-charcoal">This page has wandered off</h1>
      <p className="max-w-sm text-charcoal-muted">The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.</p>
      <Link to="/" className="btn-primary">
        Back to Home
      </Link>
    </div>
  )
}
