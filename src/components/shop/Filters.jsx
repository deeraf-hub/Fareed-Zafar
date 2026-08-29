import { X } from 'lucide-react'
import { CATEGORIES } from '../../data/categories.js'
import { formatPKR } from '../../lib/format.js'

export default function Filters({
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceChange,
  bounds,
  onClear,
  onClose,
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-steel-100 px-4 py-4 lg:hidden">
        <h2 className="font-heading text-lg font-bold text-navy-900">Filters</h2>
        <button type="button" onClick={onClose} aria-label="Close filters" className="text-steel-500 hover:text-navy-900">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto p-4 thin-scrollbar">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-navy-900">Category</h3>
            <button type="button" onClick={onClear} className="text-xs font-medium text-accent-600 hover:underline">
              Clear all
            </button>
          </div>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => onCategoryChange('all')}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-navy-800 font-semibold text-white'
                    : 'text-steel-700 hover:bg-steel-50'
                }`}
              >
                All Products
              </button>
            </li>
            {CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onCategoryChange(cat.id)}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-navy-800 font-semibold text-white'
                      : 'text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-navy-900">Price Range</h3>
          <div className="space-y-3">
            <input
              type="range"
              min={bounds.min}
              max={bounds.max}
              step={50}
              value={priceRange[1]}
              onChange={(e) => onPriceChange([priceRange[0], Number(e.target.value)])}
              className="w-full accent-accent-500"
            />
            <div className="flex items-center gap-2 text-sm">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-steel-500">Min</label>
                <input
                  type="number"
                  min={bounds.min}
                  max={priceRange[1]}
                  value={priceRange[0]}
                  onChange={(e) => onPriceChange([Number(e.target.value), priceRange[1]])}
                  className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm focus:border-navy-700 focus:outline-none"
                />
              </div>
              <span className="mt-4 text-steel-400">–</span>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-steel-500">Max</label>
                <input
                  type="number"
                  min={priceRange[0]}
                  max={bounds.max}
                  value={priceRange[1]}
                  onChange={(e) => onPriceChange([priceRange[0], Number(e.target.value)])}
                  className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm focus:border-navy-700 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-steel-500">
              {formatPKR(priceRange[0])} – {formatPKR(priceRange[1])}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-steel-100 p-4 lg:hidden">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-md bg-accent-500 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          Show Results
        </button>
      </div>
    </div>
  )
}
