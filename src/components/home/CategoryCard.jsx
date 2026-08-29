import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getCategoryImage } from '../../data/images.js'

export default function CategoryCard({ category }) {
  return (
    <Link
      to={`/shop?category=${category.id}`}
      className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-lg shadow-sm transition-shadow hover:shadow-lg md:h-56"
    >
      <img
        src={getCategoryImage(category.id)}
        alt={category.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-transparent" />
      <div className="relative p-4">
        <h3 className="font-heading text-base font-bold text-white md:text-lg">{category.name}</h3>
        <p className="mb-2 hidden text-xs text-steel-200 md:block">{category.description}</p>
        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-accent-400 group-hover:text-accent-300">
          Shop Now <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  )
}
