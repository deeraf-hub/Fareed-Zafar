import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={`text-[11px] uppercase tracking-wideish ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-stoneish">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.to ? (
              <Link to={item.to} className="transition-colors hover:text-navy-700">
                {item.label}
              </Link>
            ) : (
              <span className="text-navy-700">{item.label}</span>
            )}
            {index < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
