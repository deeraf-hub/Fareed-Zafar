import { MinusIcon, PlusIcon } from './icons'

interface QuantityStepperProps {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  size?: 'sm' | 'md'
  label?: string
}

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  size = 'md',
  label = 'Quantity',
}: QuantityStepperProps) {
  const pad = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'
  return (
    <div className="inline-flex items-center border border-linen bg-white" role="group" aria-label={label}>
      <button
        type="button"
        className={`${pad} grid place-items-center text-navy-700 transition-colors hover:bg-cream disabled:opacity-40`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <MinusIcon />
      </button>
      <span className={`${size === 'sm' ? 'w-8 text-xs' : 'w-12 text-sm'} text-center tabular-nums`}>
        {value}
      </span>
      <button
        type="button"
        className={`${pad} grid place-items-center text-navy-700 transition-colors hover:bg-cream disabled:opacity-40`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <PlusIcon />
      </button>
    </div>
  )
}
