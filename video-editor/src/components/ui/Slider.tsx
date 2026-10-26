import { useState } from 'react';
import { clamp } from '@/lib/time';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  decimals?: number;
  onChange: (value: number) => void;
  /** Fired when the pointer is released / the number input is committed. */
  onCommit?: () => void;
  disabled?: boolean;
}

export function Slider({ label, value, min, max, step = 0.01, unit = '', decimals = 2, onChange, onCommit, disabled }: SliderProps) {
  const [text, setText] = useState(value.toFixed(decimals));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value.toFixed(decimals));
  }
  const commitText = () => {
    const n = parseFloat(text);
    if (!Number.isNaN(n)) onChange(clamp(n, min, max));
    else setText(value.toFixed(decimals));
    onCommit?.();
  };
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 truncate text-xs text-ink-300" title={label}>
        {label}
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={() => onCommit?.()}
        onKeyUp={() => onCommit?.()}
        className="flex-1"
      />
      <div className="flex w-[64px] shrink-0 items-center rounded border border-ink-600 bg-ink-800 px-1">
        <input
          className="w-full bg-transparent py-0.5 text-right text-xs tabular-nums text-ink-100 outline-none"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          aria-label={`${label} value`}
        />
        {unit && <span className="pl-0.5 text-[10px] text-ink-400">{unit}</span>}
      </div>
    </div>
  );
}
