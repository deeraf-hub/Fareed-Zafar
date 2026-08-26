import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  size?: 'sm' | 'md';
}

export const QuantityStepper = ({
  value,
  onChange,
  min = 1,
  max = 99,
  label = 'Quantity',
  size = 'md',
}: QuantityStepperProps) => {
  const buttonSize = size === 'sm' ? 'size-9' : 'size-11';
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className="inline-flex items-center rounded-lg border border-ink-200">
      <button
        type="button"
        className={`${buttonSize} flex items-center justify-center rounded-l-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40`}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <input
        type="number"
        className={`${size === 'sm' ? 'w-10' : 'w-14'} border-x border-ink-200 bg-white py-2 text-center text-sm font-semibold text-ink-900 focus:outline-none`}
        value={value}
        min={min}
        max={max}
        aria-label={label}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          onChange(Number.isFinite(parsed) ? clamp(parsed) : min);
        }}
      />
      <button
        type="button"
        className={`${buttonSize} flex items-center justify-center rounded-r-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40`}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
};
