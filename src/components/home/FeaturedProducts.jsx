import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PRODUCTS } from '../../data/products.js'
import ProductGrid from '../shop/ProductGrid.jsx'

const FEATURED = PRODUCTS.filter((p) => p.badge === 'Popular').slice(0, 8)

export default function FeaturedProducts() {
  return (
    <section className="bg-steel-50 py-16 md:py-20">
      <div className="container-app">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-accent-600">Best Sellers</span>
            <h2 className="mt-2 font-heading text-3xl font-bold text-navy-900 md:text-4xl">
              Popular Tools
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-accent-600"
          >
            Shop All Products <ArrowRight size={16} />
          </Link>
        </div>
        <ProductGrid products={FEATURED} />
      </div>
    </section>
  )
}
