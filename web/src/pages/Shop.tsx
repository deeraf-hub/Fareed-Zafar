import { PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { ProductGridSkeleton } from '../components/ui/Skeletons';
import { FilterSidebar } from '../components/shop/FilterSidebar';
import { SearchBar } from '../components/shop/SearchBar';
import { ProductGrid } from '../components/product/ProductGrid';
import { siteConfig } from '../config/site';
import { activeFilterCount, applyShopFilters, priceBands, sortOptions } from '../lib/catalog';
import { useSeo } from '../lib/seo';
import { useEscapeKey } from '../lib/useEscapeKey';
import { useCatalog } from '../store/CatalogContext';
import type { CategorySlug, ShopFilters, SortKey } from '../types';

const PAGE_SIZE = 12;

/** Reads filter state out of the URL so every result set is shareable. */
const filtersFromParams = (params: URLSearchParams): ShopFilters => ({
  query: params.get('q') ?? '',
  categories: (params.get('category')?.split(',').filter(Boolean) ?? []) as CategorySlug[],
  bikes: params.get('bike')?.split(',').filter(Boolean) ?? [],
  priceBands: params.get('price')?.split(',').filter(Boolean) ?? [],
  customMin: params.get('min') ? Number(params.get('min')) : null,
  customMax: params.get('max') ? Number(params.get('max')) : null,
  availability: (params.get('stock')?.split(',').filter(Boolean) ?? []) as ShopFilters['availability'],
  sort: (params.get('sort') as SortKey) ?? 'featured',
});

const Shop = () => {
  const { products, categories, loading } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filters = useMemo(() => filtersFromParams(params), [params]);

  useEscapeKey(filtersOpen, useCallback(() => setFiltersOpen(false), []));

  useSeo({
    title: filters.query
      ? `Search: ${filters.query} | ${siteConfig.name}`
      : `Shop Motorcycle Spare Parts | ${siteConfig.name}`,
    description:
      'Browse motorcycle spare parts by category, bike model, price and availability. Engine, electrical, brake, suspension, chain and accessory parts with cash on delivery in Pakistan.',
  });

  const results = useMemo(() => applyShopFilters(products, filters), [products, filters]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [params]);

  const updateFilters = useCallback(
    (patch: Partial<ShopFilters>) => {
      const next = { ...filters, ...patch };
      const search = new URLSearchParams();
      if (next.query) search.set('q', next.query);
      if (next.categories.length) search.set('category', next.categories.join(','));
      if (next.bikes.length) search.set('bike', next.bikes.join(','));
      if (next.priceBands.length) search.set('price', next.priceBands.join(','));
      if (next.customMin !== null) search.set('min', String(next.customMin));
      if (next.customMax !== null) search.set('max', String(next.customMax));
      if (next.availability.length) search.set('stock', next.availability.join(','));
      if (next.sort !== 'featured') search.set('sort', next.sort);
      setParams(search, { replace: true });
    },
    [filters, setParams],
  );

  const resetFilters = useCallback(() => {
    const search = new URLSearchParams();
    if (filters.query) search.set('q', filters.query);
    setParams(search, { replace: true });
  }, [filters.query, setParams]);

  const appliedCount = activeFilterCount(filters);

  const chips = [
    ...filters.categories.map((slug) => ({
      key: `cat-${slug}`,
      label: categories.find((c) => c.slug === slug)?.name ?? slug,
      remove: () => updateFilters({ categories: filters.categories.filter((item) => item !== slug) }),
    })),
    ...filters.bikes.map((bike) => ({
      key: `bike-${bike}`,
      label: bike,
      remove: () => updateFilters({ bikes: filters.bikes.filter((item) => item !== bike) }),
    })),
    ...filters.priceBands.map((id) => ({
      key: `price-${id}`,
      label: priceBands.find((band) => band.id === id)?.label ?? id,
      remove: () => updateFilters({ priceBands: filters.priceBands.filter((item) => item !== id) }),
    })),
    ...filters.availability.map((value) => ({
      key: `stock-${value}`,
      label: value === 'in-stock' ? 'In stock' : 'Out of stock',
      remove: () => updateFilters({ availability: filters.availability.filter((item) => item !== value) }),
    })),
    ...(filters.customMin !== null || filters.customMax !== null
      ? [
          {
            key: 'custom-price',
            label: `PKR ${filters.customMin ?? 0} – ${filters.customMax ?? '5,000+'}`,
            remove: () => updateFilters({ customMin: null, customMax: null }),
          },
        ]
      : []),
  ];

  const sidebar = (
    <FilterSidebar
      filters={filters}
      categories={categories}
      products={products}
      onChange={updateFilters}
      onReset={resetFilters}
    />
  );

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop' }]} />

      <div className="mb-6">
        <h1 className="section-title">{filters.query ? `Results for “${filters.query}”` : 'Shop Spare Parts'}</h1>
        <p className="mt-2 text-sm text-ink-500">
          {loading ? 'Loading products…' : `${results.length} ${results.length === 1 ? 'product' : 'products'} available`}
        </p>
      </div>

      <div className="mb-6 lg:hidden">
        <SearchBar initialValue={filters.query} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto pr-2">{sidebar}</div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-outline lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters
              {appliedCount > 0 && (
                <span className="ml-1 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
                  {appliedCount}
                </span>
              )}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-ink-500">
                Sort by
              </label>
              <select
                id="sort"
                className="field h-11 w-auto py-2"
                value={filters.sort}
                onChange={(event) => updateFilters({ sort: event.target.value as SortKey })}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="mb-5 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button type="button" onClick={chip.remove} className="badge bg-ink-100 text-ink-700 hover:bg-ink-200">
                    {chip.label}
                    <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Remove filter</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : results.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description="Try another search or browse our categories. You can also send us the part name on WhatsApp and we will check for you."
              action={
                <button type="button" className="btn-primary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                  Clear search and filters
                </button>
              }
            />
          ) : (
            <>
              <ProductGrid
                products={results.slice(0, visible)}
                className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
              />
              {visible < results.length && (
                <div className="mt-8 flex justify-center">
                  <button type="button" className="btn-outline px-8" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                    Load more parts ({results.length - visible} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-200 px-4">
              <span className="text-base font-bold text-ink-900">Filters</span>
              <button type="button" className="btn-ghost px-2" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{sidebar}</div>
            <div className="border-t border-ink-200 p-4">
              <button type="button" className="btn-primary w-full" onClick={() => setFiltersOpen(false)}>
                Show {results.length} {results.length === 1 ? 'product' : 'products'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
