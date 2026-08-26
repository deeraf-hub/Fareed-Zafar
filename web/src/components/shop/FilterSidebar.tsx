import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { bikes } from '../../data/bikes';
import { priceBands } from '../../lib/catalog';
import type { Category, CategorySlug, Product, ShopFilters } from '../../types';

interface FilterSidebarProps {
  filters: ShopFilters;
  categories: Category[];
  products: Product[];
  onChange: (patch: Partial<ShopFilters>) => void;
  onReset: () => void;
}

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export const FilterSidebar = ({ filters, categories, products, onChange, onReset }: FilterSidebarProps) => {
  const [minInput, setMinInput] = useState(filters.customMin?.toString() ?? '');
  const [maxInput, setMaxInput] = useState(filters.customMax?.toString() ?? '');

  useEffect(() => {
    setMinInput(filters.customMin?.toString() ?? '');
    setMaxInput(filters.customMax?.toString() ?? '');
  }, [filters.customMin, filters.customMax]);

  const countFor = (predicate: (product: Product) => boolean) => products.filter(predicate).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Filters</h2>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <RotateCcw className="size-3.5" aria-hidden="true" /> Reset
        </button>
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-ink-900">Category</legend>
        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
                  checked={filters.categories.includes(category.slug)}
                  onChange={() => onChange({ categories: toggle<CategorySlug>(filters.categories, category.slug) })}
                />
                <span className="flex-1">{category.name}</span>
                <span className="text-xs text-ink-400">{countFor((p) => p.category === category.slug)}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="border-t border-ink-100 pt-5">
        <legend className="mb-3 text-sm font-semibold text-ink-900">Price</legend>
        <ul className="space-y-2">
          {priceBands.map((band) => (
            <li key={band.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
                  checked={filters.priceBands.includes(band.id)}
                  onChange={() => onChange({ priceBands: toggle(filters.priceBands, band.id) })}
                />
                <span className="flex-1">{band.label}</span>
                <span className="text-xs text-ink-400">
                  {countFor((p) => p.price >= band.min && (band.max === null || p.price <= band.max))}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="price-min" className="field-label text-xs">
              Min (PKR)
            </label>
            <input
              id="price-min"
              type="number"
              min={0}
              inputMode="numeric"
              className="field py-2"
              placeholder="0"
              value={minInput}
              onChange={(event) => setMinInput(event.target.value)}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="price-max" className="field-label text-xs">
              Max (PKR)
            </label>
            <input
              id="price-max"
              type="number"
              min={0}
              inputMode="numeric"
              className="field py-2"
              placeholder="5000"
              value={maxInput}
              onChange={(event) => setMaxInput(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-outline px-3"
            onClick={() =>
              onChange({
                customMin: minInput.trim() ? Number(minInput) : null,
                customMax: maxInput.trim() ? Number(maxInput) : null,
              })
            }
          >
            Go
          </button>
        </div>
      </fieldset>

      <fieldset className="border-t border-ink-100 pt-5">
        <legend className="mb-3 text-sm font-semibold text-ink-900">Motorcycle</legend>
        <ul className="space-y-2">
          {bikes.map((bike) => (
            <li key={bike.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
                  checked={filters.bikes.includes(bike.name)}
                  onChange={() => onChange({ bikes: toggle(filters.bikes, bike.name) })}
                />
                <span className="flex-1">{bike.name}</span>
                <span className="text-xs text-ink-400">{countFor((p) => p.compatibleBikes.includes(bike.name))}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="border-t border-ink-100 pt-5">
        <legend className="mb-3 text-sm font-semibold text-ink-900">Availability</legend>
        <ul className="space-y-2">
          <li>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
              <input
                type="checkbox"
                className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
                checked={filters.availability.includes('in-stock')}
                onChange={() => onChange({ availability: toggle(filters.availability, 'in-stock' as const) })}
              />
              <span className="flex-1">In stock</span>
              <span className="text-xs text-ink-400">{countFor((p) => p.stock)}</span>
            </label>
          </li>
          <li>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
              <input
                type="checkbox"
                className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
                checked={filters.availability.includes('out-of-stock')}
                onChange={() => onChange({ availability: toggle(filters.availability, 'out-of-stock' as const) })}
              />
              <span className="flex-1">Out of stock</span>
              <span className="text-xs text-ink-400">{countFor((p) => !p.stock)}</span>
            </label>
          </li>
        </ul>
      </fieldset>
    </div>
  );
};
