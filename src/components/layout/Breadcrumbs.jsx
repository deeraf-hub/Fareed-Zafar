import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-steel-100 bg-steel-50">
      <div className="container-app flex flex-wrap items-center gap-1.5 py-3 text-xs text-steel-500 md:text-sm">
        <Link to="/" className="hover:text-accent-600">
          Home
        </Link>
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight size={14} className="text-steel-300" />
            {item.to ? (
              <Link to={item.to} className="hover:text-accent-600">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-navy-900">{item.label}</span>
            )}
          </span>
        ))}
      </div>
    </nav>
  )
}
