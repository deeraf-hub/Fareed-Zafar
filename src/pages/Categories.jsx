import { useEffect } from 'react'
import { CATEGORIES } from '../data/categories.js'
import { PRODUCTS } from '../data/products.js'
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx'
import CategoryCard from '../components/home/CategoryCard.jsx'

export default function Categories() {
  useEffect(() => {
    document.title = 'Shop by Category | Hand Tools Trading Corporation'
  }, [])

  const counts = PRODUCTS.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1
    return acc
  }, {})

  return (
    <>
      <Breadcrumbs items={[{ label: 'Categories' }]} />

      <div className="container-app py-8 md:py-12">
        <div className="mb-8 max-w-2xl">
          <h1 className="font-heading text-2xl font-bold text-navy-900 md:text-3xl">
            Shop by Category
          </h1>
          <p className="mt-2 text-sm text-steel-500 md:text-base">
            From hammers and drill machines to fasteners and workshop tools, find exactly what you
            need for your next job.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <div key={category.id} className="relative">
              <CategoryCard category={category} />
              <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-navy-800">
                {counts[category.id] || 0} items
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
