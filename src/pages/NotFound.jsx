import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Wrench } from 'lucide-react'

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page Not Found | Hand Tools Trading Corporation'
  }, [])

  return (
    <div className="container-app flex flex-col items-center py-20 text-center md:py-28">
      <Wrench size={48} className="text-steel-300" />
      <h1 className="mt-6 font-heading text-5xl font-bold text-navy-900">404</h1>
      <p className="mt-3 text-lg font-semibold text-navy-800">Page Not Found</p>
      <p className="mt-2 max-w-sm text-sm text-steel-500">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600"
      >
        Back to Home
      </Link>
    </div>
  )
}
