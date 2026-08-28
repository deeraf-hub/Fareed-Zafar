import { Link } from 'react-router-dom'
import { categories } from '@/data/categories'
import { allMaterials, priceBuckets, type ShopFilterState } from './types'
import { StarIcon } from '@/components/ui/Icons'

export function FilterSidebar({
  activeCategory,
  filters,
  onChange,
  onReset,
}: {
  activeCategory?: string
  filters: ShopFilterState
  onChange: (next: ShopFilterState) => void
  onReset: () => void
}) {
  const toggleMaterial = (material: (typeof allMaterials)[number]) => {
    const has = filters.materials.includes(material)
    onChange({
      ...filters,
      materials: has ? filters.materials.filter((m) => m !== material) : [...filters.materials, material],
    })
  }

  return (
    <aside className="flex flex-col gap-9">
      <div>
        <h3 className="eyebrow mb-4">Category</h3>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              to="/shop"
              className={`text-sm transition-colors hover:text-champagne-700 ${!activeCategory ? 'text-champagne-700' : 'text-charcoal-soft'}`}
            >
              All Jewellery
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/shop/${c.slug}`}
                className={`text-sm transition-colors hover:text-champagne-700 ${activeCategory === c.slug ? 'text-champagne-700' : 'text-charcoal-soft'}`}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="eyebrow mb-4">Price Range</h3>
        <ul className="flex flex-col gap-2.5">
          {priceBuckets.map((bucket, i) => (
            <li key={bucket.label}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-soft">
                <input
                  type="radio"
                  name="price-range"
                  checked={filters.priceBucketIndex === i}
                  onChange={() => onChange({ ...filters, priceBucketIndex: filters.priceBucketIndex === i ? null : i })}
                  className="accent-champagne-600"
                />
                {bucket.label}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="eyebrow mb-4">Material</h3>
        <ul className="flex flex-col gap-2.5">
          {allMaterials.map((material) => (
            <li key={material}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-soft">
                <input
                  type="checkbox"
                  checked={filters.materials.includes(material)}
                  onChange={() => toggleMaterial(material)}
                  className="accent-champagne-600"
                />
                {material}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="eyebrow mb-4">Collection</h3>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-soft">
          <input
            type="checkbox"
            checked={filters.bridalOnly}
            onChange={() => onChange({ ...filters, bridalOnly: !filters.bridalOnly })}
            className="accent-champagne-600"
          />
          Bridal Collection
        </label>
      </div>

      <div>
        <h3 className="eyebrow mb-4">Availability</h3>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-charcoal-soft">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
            className="accent-champagne-600"
          />
          In Stock Only
        </label>
      </div>

      <div>
        <h3 className="eyebrow mb-4">Rating</h3>
        <ul className="flex flex-col gap-2.5">
          {[4, 3].map((r) => (
            <li key={r}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal-soft">
                <input
                  type="radio"
                  name="min-rating"
                  checked={filters.minRating === r}
                  onChange={() => onChange({ ...filters, minRating: filters.minRating === r ? 0 : r })}
                  className="accent-champagne-600"
                />
                <span className="flex items-center gap-1 text-champagne-600">
                  {Array.from({ length: r }).map((_, i) => (
                    <StarIcon key={i} filled width={12} height={12} />
                  ))}
                </span>
                <span>& Up</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" onClick={onReset} className="btn-ghost self-start">
        Clear All Filters
      </button>
    </aside>
  )
}
