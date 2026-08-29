import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Search, X } from 'lucide-react'
import { PRODUCTS, PRICE_BOUNDS } from '../data/products.js'
import { CATEGORY_MAP } from '../data/categories.js'
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx'
import Filters from '../components/shop/Filters.jsx'
import SortDropdown from '../components/shop/SortDropdown.jsx'
import ProductGrid from '../components/shop/ProductGrid.jsx'

const sortProducts = (products, sortBy) => {
  const sorted = [...products]
  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price)
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'newest':
      return sorted.sort((a, b) => (b.badge === 'New' ? 1 : 0) - (a.badge === 'New' ? 1 : 0))
    default:
      return sorted.sort((a, b) => (b.badge === 'Popular' ? 1 : 0) - (a.badge === 'Popular' ? 1 : 0))
  }
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [priceRange, setPriceRange] = useState([PRICE_BOUNDS.min, PRICE_BOUNDS.max])

  const category = searchParams.get('category') || 'all'
  const query = searchParams.get('q') || ''
  const sortBy = searchParams.get('sort') || 'featured'

  useEffect(() => {
    document.title = 'Shop Hardware & Hand Tools | Hand Tools Trading Corporation'
  }, [])

  useEffect(() => {
    setSearchInput(query)
  }, [query])

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    updateParam('q', searchInput.trim())
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PRODUCTS.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false
      if (q && !(p.name.toLowerCase().includes(q) || p.shortDescription.toLowerCase().includes(q)))
        return false
      return true
    })
  }, [category, priceRange, query])

  const sorted = useMemo(() => sortProducts(filtered, sortBy), [filtered, sortBy])

  const clearFilters = () => {
    setPriceRange([PRICE_BOUNDS.min, PRICE_BOUNDS.max])
    setSearchParams({})
    setSearchInput('')
  }

  const activeCategoryName = category !== 'all' ? CATEGORY_MAP[category]?.name : null

  return (
    <>
      <Breadcrumbs items={[{ label: 'Shop' }]} />

      <div className="container-app py-8 md:py-10">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-navy-900 md:text-3xl">
            {activeCategoryName || 'All Products'}
          </h1>
          <p className="mt-1 text-sm text-steel-500">
            {sorted.length} product{sorted.length !== 1 ? 's' : ''} available
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-6 flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search for hammer, drill, wrench, socket..."
              className="w-full rounded-md border border-steel-200 bg-white py-2.5 pl-10 pr-9 text-sm text-navy-900 focus:border-navy-700 focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  updateParam('q', '')
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-steel-400 hover:text-navy-900"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="rounded-md bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700"
          >
            Search
          </button>
        </form>

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 rounded-lg border border-steel-100 bg-white">
              <Filters
                selectedCategory={category}
                onCategoryChange={(val) => updateParam('category', val)}
                priceRange={priceRange}
                onPriceChange={setPriceRange}
                bounds={PRICE_BOUNDS}
                onClear={clearFilters}
                onClose={() => {}}
              />
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="flex items-center gap-2 rounded-md border border-steel-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 lg:hidden"
              >
                <SlidersHorizontal size={16} />
                Filters
              </button>
              <div className="ml-auto">
                <SortDropdown value={sortBy} onChange={(val) => updateParam('sort', val)} />
              </div>
            </div>

            <ProductGrid products={sorted} />
          </div>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-navy-950/60"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-full max-w-xs bg-white shadow-2xl">
            <Filters
              selectedCategory={category}
              onCategoryChange={(val) => updateParam('category', val)}
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              bounds={PRICE_BOUNDS}
              onClear={clearFilters}
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
