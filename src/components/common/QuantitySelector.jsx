import { Minus, Plus } from 'lucide-react'

export default function QuantitySelector({ value, onChange, min = 1, max = 99, size = 'md' }) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'

  return (
    <div className="inline-flex items-center rounded-md border border-steel-200 bg-white">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={`${dims} flex items-center justify-center text-steel-700 hover:bg-steel-50 disabled:opacity-30 disabled:hover:bg-transparent`}
      >
        <Minus size={15} />
      </button>
      <span className="w-10 text-center text-sm font-semibold text-navy-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={`${dims} flex items-center justify-center text-steel-700 hover:bg-steel-50 disabled:opacity-30 disabled:hover:bg-transparent`}
      >
        <Plus size={15} />
      </button>
    </div>
  )
}
