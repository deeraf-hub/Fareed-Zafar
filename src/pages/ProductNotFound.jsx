import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PackageX } from 'lucide-react'

export default function ProductNotFound() {
  useEffect(() => {
    document.title = 'Product Not Found | Hand Tools Trading Corporation'
  }, [])

  return (
    <div className="container-app flex flex-col items-center py-20 text-center md:py-28">
      <PackageX size={48} className="text-steel-300" />
      <h1 className="mt-6 font-heading text-2xl font-bold text-navy-900 md:text-3xl">Product Not Found</h1>
      <p className="mt-2 max-w-sm text-sm text-steel-500">
        This product may have been removed or is no longer available. Browse our shop to find
        similar tools.
      </p>
      <Link
        to="/shop"
        className="mt-6 rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600"
      >
        Browse Shop
      </Link>
    </div>
  )
}
