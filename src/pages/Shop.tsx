import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { products } from '@/data/products'
import { getCategory } from '@/data/categories'
import { ProductGrid } from '@/components/ui/ProductGrid'
import { FilterSidebar } from '@/components/shop/FilterSidebar'
import { defaultFilters, priceBuckets, sortLabels, type ShopFilterState, type SortOption } from '@/components/shop/types'
import { CloseIcon } from '@/components/ui/Icons'
import { useSeo } from '@/lib/useSeo'
import { siteConfig } from '@/config/site'

const PAGE_SIZE = 12

export function Shop() {
  const { category } = useParams<{ category?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<ShopFilterState>(defaultFilters)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const sort = (searchParams.get('sort') as SortOption) || 'featured'
  const query = searchParams.get('q')?.trim().toLowerCase() ?? ''
  const categoryInfo = category ? getCategory(category) : undefined

  const pageTitle = category === 'new-arrivals' ? 'New Arrivals' : categoryInfo?.name ?? (query ? `Search: ${query}` : 'Shop All Jewellery')
  useSeo(pageTitle, `Shop ${pageTitle.toLowerCase()} at ${siteConfig.brandName} — premium jewellery, PKR pricing, nationwide delivery.`)

  const setSort = (next: SortOption) => {
    const params = new URLSearchParams(searchParams)
    params.set('sort', next)
    setSearchParams(params)
    setVisibleCount(PAGE_SIZE)
  }

  const filtered = useMemo(() => {
    let list = [...products]

    if (category === 'new-arrivals') {
      list = list.filter((p) => p.isNew)
    } else if (category) {
      list = list.filter((p) => p.category === category)
    }

    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.includes(query) ||
          p.material.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      )
    }

    if (filters.priceBucketIndex !== null) {
      const bucket = priceBuckets[filters.priceBucketIndex]
      list = list.filter((p) => p.price >= bucket.min && p.price < bucket.max)
    }

    if (filters.materials.length > 0) {
      list = list.filter((p) => filters.materials.includes(p.material))
    }

    if (filters.bridalOnly) {
      list = list.filter((p) => p.category === 'bridal')
    }

    if (filters.inStockOnly) {
      list = list.filter((p) => p.inStock)
    }

    if (filters.minRating > 0) {
      list = list.filter((p) => p.rating >= filters.minRating)
    }

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'best-selling':
        list.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller) || b.reviewCount - a.reviewCount)
        break
      case 'newest':
        list.sort((a, b) => Number(b.isNew) - Number(a.isNew))
        break
      default:
        list.sort((a, b) => Number(b.featured) - Number(a.featured))
    }

    return list
  }, [category, query, filters, sort])

  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="container-lux py-12 sm:py-16">
      <div className="mb-10 flex flex-col gap-3 border-b border-beige pb-8">
        <span className="eyebrow">Shop</span>
        <h1 className="text-3xl sm:text-4xl text-charcoal">{pageTitle}</h1>
        {categoryInfo?.description && <p className="max-w-xl text-charcoal-muted">{categoryInfo.description}</p>}
      </div>

      <div className="flex items-center justify-between gap-4 pb-6">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="btn-secondary py-2.5 text-xs lg:hidden"
        >
          Filters
        </button>
        <p className="hidden text-sm text-charcoal-muted lg:block">{filtered.length} products</p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="input-field w-auto py-2.5 text-xs uppercase tracking-wide sm:ml-auto"
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
        <div className="hidden lg:block">
          <FilterSidebar
            activeCategory={category}
            filters={filters}
            onChange={(next) => {
              setFilters(next)
              setVisibleCount(PAGE_SIZE)
            }}
            onReset={() => setFilters(defaultFilters)}
          />
        </div>

        <div>
          {visible.length === 0 ? (
            <p className="py-20 text-center text-charcoal-muted">No products match your filters just yet.</p>
          ) : (
            <ProductGrid products={visible} />
          )}

          {visibleCount < filtered.length && (
            <div className="mt-14 flex justify-center">
              <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="btn-secondary">
                Load More
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[85] lg:hidden">
          <button aria-label="Close filters" className="absolute inset-0 bg-charcoal/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-ivory p-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="eyebrow">Filters</span>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <FilterSidebar
              activeCategory={category}
              filters={filters}
              onChange={(next) => {
                setFilters(next)
                setVisibleCount(PAGE_SIZE)
              }}
              onReset={() => setFilters(defaultFilters)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
