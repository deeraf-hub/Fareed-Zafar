import { shoppableCategories } from '@/data/categories'
import { collections, materials } from '@/data/products'
import { formatPrice } from '@/lib/format'

export const PRICE_BANDS = [
  { id: 'under-1000', label: 'Under Rs. 1,000', min: 0, max: 999 },
  { id: '1000-2500', label: 'Rs. 1,000 – 2,500', min: 1000, max: 2500 },
  { id: '2500-5000', label: 'Rs. 2,500 – 5,000', min: 2500, max: 5000 },
  { id: 'above-5000', label: 'Above Rs. 5,000', min: 5000, max: Number.POSITIVE_INFINITY },
] as const

export const RATING_BANDS = [
  { id: '4.5', label: '4.5 & above' },
  { id: '4', label: '4.0 & above' },
] as const

export interface FilterState {
  categories: string[]
  price: string[]
  materials: string[]
  collections: string[]
  inStockOnly: boolean
  rating: string | null
}

interface FilterPanelProps {
  state: FilterState
  onToggle: (group: keyof FilterState, value: string) => void
  onClear: () => void
  /** Hidden when the page is already scoped to a single category. */
  showCategories?: boolean
  resultCount: number
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-linen py-6 first:pt-0">
      <h3 className="text-[11px] uppercase tracking-luxe text-navy-700">{title}</h3>
      <div className="mt-4 space-y-2.5">{children}</div>
    </section>
  )
}

function Check({
  checked,
  label,
  onChange,
  type = 'checkbox',
}: {
  checked: boolean
  label: string
  onChange: () => void
  type?: 'checkbox' | 'radio'
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-stoneish transition-colors hover:text-navy-700">
      <input
        type={type}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-navy-700"
      />
      {label}
    </label>
  )
}

export function FilterPanel({
  state,
  onToggle,
  onClear,
  showCategories = true,
  resultCount,
}: FilterPanelProps) {
  const activeCount =
    state.categories.length +
    state.price.length +
    state.materials.length +
    state.collections.length +
    (state.inStockOnly ? 1 : 0) +
    (state.rating ? 1 : 0)

  return (
    <div>
      <div className="flex items-center justify-between border-b border-linen pb-4">
        <p className="text-[11px] uppercase tracking-wideish text-stoneish">
          {resultCount} {resultCount === 1 ? 'piece' : 'pieces'}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="link-underline text-[11px] uppercase tracking-wideish text-champagne-700"
          >
            Clear ({activeCount})
          </button>
        )}
      </div>

      <div className="pt-6">
        {showCategories && (
          <Group title="Category">
            {shoppableCategories.map((category) => (
              <Check
                key={category.slug}
                label={category.name}
                checked={state.categories.includes(category.slug)}
                onChange={() => onToggle('categories', category.slug)}
              />
            ))}
          </Group>
        )}

        <Group title="Price">
          {PRICE_BANDS.map((band) => (
            <Check
              key={band.id}
              label={band.label}
              checked={state.price.includes(band.id)}
              onChange={() => onToggle('price', band.id)}
            />
          ))}
        </Group>

        <Group title="Material">
          {materials.map((material) => (
            <Check
              key={material}
              label={material}
              checked={state.materials.includes(material)}
              onChange={() => onToggle('materials', material)}
            />
          ))}
        </Group>

        <Group title="Collection">
          {collections.map((collection) => (
            <Check
              key={collection}
              label={collection}
              checked={state.collections.includes(collection)}
              onChange={() => onToggle('collections', collection)}
            />
          ))}
        </Group>

        <Group title="Availability">
          <Check
            label="In stock only"
            checked={state.inStockOnly}
            onChange={() => onToggle('inStockOnly', 'true')}
          />
        </Group>

        <Group title="Rating">
          {RATING_BANDS.map((band) => (
            <Check
              key={band.id}
              type="radio"
              label={band.label}
              checked={state.rating === band.id}
              onChange={() => onToggle('rating', band.id)}
            />
          ))}
        </Group>

        <p className="pt-6 text-xs text-stoneish">
          Everything in the collection is priced between {formatPrice(500)} and {formatPrice(7000)}.
        </p>
      </div>
    </div>
  )
}
