import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { Product } from '@/types'
import { products as allProducts } from '@/data/products'
import { getCategory, shoppableCategories } from '@/data/categories'
import { searchProducts } from '@/lib/search'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Button } from '@/components/ui/Button'
import { FilterIcon, CloseIcon } from '@/components/ui/icons'
import {
  FilterPanel,
  PRICE_BANDS,
  type FilterState,
} from '@/components/shop/FilterPanel'
import NotFound from './NotFound'

const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'best-selling', label: 'Best Selling' },
] as const

function sortProducts(list: Product[], sort: string): Product[] {
  const sorted = [...list]
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price)
    case 'best-selling':
      return sorted.sort(
        (a, b) => Number(b.isBestSeller) - Number(a.isBestSeller) || b.reviewCount - a.reviewCount,
      )
    default:
      return sorted.sort(
        (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.rating - a.rating,
      )
  }
}

export default function Shop() {
  const { category: categoryParam } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const routeCategory = categoryParam ? getCategory(categoryParam) : undefined
  const query = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') ?? 'featured'
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))

  const filters = useMemo<FilterState>(
    () => ({
      categories: searchParams.getAll('category'),
      price: searchParams.getAll('price'),
      materials: searchParams.getAll('material'),
      collections: searchParams.getAll('collection'),
      inStockOnly: searchParams.get('stock') === 'true',
      rating: searchParams.get('rating'),
    }),
    [searchParams],
  )

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams)
      mutate(next)
      next.delete('page')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const onToggle = useCallback(
    (group: keyof FilterState, value: string) => {
      const keyMap: Record<keyof FilterState, string> = {
        categories: 'category',
        price: 'price',
        materials: 'material',
        collections: 'collection',
        inStockOnly: 'stock',
        rating: 'rating',
      }
      const key = keyMap[group]

      updateParams((params) => {
        if (group === 'inStockOnly') {
          if (params.get('stock') === 'true') params.delete('stock')
          else params.set('stock', 'true')
          return
        }
        if (group === 'rating') {
          if (params.get('rating') === value) params.delete('rating')
          else params.set('rating', value)
          return
        }
        const current = params.getAll(key)
        params.delete(key)
        const next = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value]
        next.forEach((entry) => params.append(key, entry))
      })
    },
    [updateParams],
  )

  const clearFilters = useCallback(() => {
    updateParams((params) => {
      ;['category', 'price', 'material', 'collection', 'stock', 'rating'].forEach((key) =>
        params.delete(key),
      )
    })
  }, [updateParams])

  const filtered = useMemo(() => {
    let list = query ? searchProducts(query) : allProducts

    if (routeCategory) {
      list = list.filter((product) => product.category === routeCategory.slug)
    } else if (filters.categories.length > 0) {
      list = list.filter((product) => filters.categories.includes(product.category))
    }

    if (filters.price.length > 0) {
      const bands = PRICE_BANDS.filter((band) => filters.price.includes(band.id))
      list = list.filter((product) =>
        bands.some((band) => product.price >= band.min && product.price <= band.max),
      )
    }

    if (filters.materials.length > 0) {
      list = list.filter((product) =>
        product.materials.some((material) => filters.materials.includes(material)),
      )
    }

    if (filters.collections.length > 0) {
      list = list.filter((product) => filters.collections.includes(product.collection))
    }

    if (filters.inStockOnly) list = list.filter((product) => product.inStock)
    if (filters.rating) list = list.filter((product) => product.rating >= Number(filters.rating))

    return sortProducts(list, sort)
  }, [query, routeCategory, filters, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  // "Load More" accumulates pages rather than replacing them, so the grid keeps growing.
  const visible = filtered.slice(0, currentPage * PAGE_SIZE)

  const loadMore = () => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(currentPage + 1))
    setSearchParams(params, { replace: true })
  }

  if (categoryParam && !routeCategory) return <NotFound />

  const title = routeCategory ? routeCategory.name : query ? `Search: ${query}` : 'All Jewellery'
  const description = routeCategory
    ? routeCategory.description
    : query
      ? `${filtered.length} ${filtered.length === 1 ? 'piece matches' : 'pieces match'} “${query}”.`
      : 'The complete Swabi Jewellers collection — gold-plated, pearl, stone-set and kundan-style pieces from Rs. 500.'

  return (
    <>
      <Seo
        title={`${title} | Shop`}
        description={typeof description === 'string' ? description : undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: title,
          numberOfItems: filtered.length,
          itemListElement: visible.slice(0, 12).map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: product.name,
            url: `/product/${product.slug}`,
          })),
        }}
      />

      <PageHeader
        eyebrow="Shop"
        title={title}
        description={description}
        crumbs={[
          { label: 'Home', to: '/' },
          { label: 'Shop', to: '/shop' },
          ...(routeCategory ? [{ label: routeCategory.name }] : []),
        ]}
      >
        {routeCategory && (
          <ul className="mt-8 flex flex-wrap gap-2">
            {shoppableCategories.map((entry) => (
              <li key={entry.slug}>
                <Link
                  to={`/shop/${entry.slug}`}
                  className={`inline-block border px-4 py-2 text-[11px] uppercase tracking-wideish transition-colors ${
                    entry.slug === routeCategory.slug
                      ? 'border-navy-700 bg-navy-700 text-ivory'
                      : 'border-linen text-navy-700 hover:border-navy-700'
                  }`}
                >
                  {entry.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageHeader>

      <div className="container-luxe py-10 lg:py-14">
        <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-32">
              <FilterPanel
                state={filters}
                onToggle={onToggle}
                onClear={clearFilters}
                showCategories={!routeCategory}
                resultCount={filtered.length}
              />
            </div>
          </aside>

          <div>
            <div className="flex items-center justify-between gap-4 border-b border-linen pb-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="flex items-center gap-2 border border-linen px-4 py-2.5 text-[11px] uppercase tracking-wideish text-navy-700 lg:hidden"
              >
                <FilterIcon width={16} height={16} />
                Filters
              </button>
              <p className="hidden text-[11px] uppercase tracking-wideish text-stoneish lg:block">
                Showing {visible.length} of {filtered.length}
              </p>
              <label className="flex items-center gap-2 text-[11px] uppercase tracking-wideish text-stoneish">
                <span className="hidden sm:inline">Sort by</span>
                <select
                  value={sort}
                  onChange={(event) =>
                    updateParams((params) => params.set('sort', event.target.value))
                  }
                  className="border border-linen bg-white px-3 py-2 text-xs normal-case tracking-normal text-navy-700 focus:border-champagne-400 focus:outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filtered.length === 0 ? (
              <div className="py-24 text-center">
                <h2 className="text-2xl">Nothing matches those filters</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm text-stoneish">
                  Try removing a filter, or browse the full collection.
                </p>
                <Button onClick={clearFilters} variant="outline" className="mt-6">
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <ProductGrid products={visible} className="mt-10" prioritiseFirst showRating />

                <div className="mt-14 flex flex-col items-center gap-4">
                  <p className="text-xs text-stoneish">
                    Showing {visible.length} of {filtered.length} pieces
                  </p>
                  {currentPage < pageCount && (
                    <Button variant="outline" onClick={loadMore}>
                      Load More
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[86] lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-navy-900/40"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(90vw,22rem)] animate-slide-down flex-col bg-ivory">
            <div className="flex items-center justify-between border-b border-linen px-5 py-4">
              <h2 className="text-lg">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="text-navy-700"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FilterPanel
                state={filters}
                onToggle={onToggle}
                onClear={clearFilters}
                showCategories={!routeCategory}
                resultCount={filtered.length}
              />
            </div>
            <div className="border-t border-linen p-5">
              <Button fullWidth onClick={() => setMobileFiltersOpen(false)}>
                Show {filtered.length} pieces
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
