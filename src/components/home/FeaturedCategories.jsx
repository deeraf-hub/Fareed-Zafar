import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { CATEGORIES } from '../../data/categories.js'
import CategoryCard from './CategoryCard.jsx'

export default function FeaturedCategories() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="container-app">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-accent-600">Browse By Category</span>
            <h2 className="mt-2 font-heading text-3xl font-bold text-navy-900 md:text-4xl">
              Featured Categories
            </h2>
          </div>
          <Link
            to="/categories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-accent-600"
          >
            View All Categories <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  )
}
