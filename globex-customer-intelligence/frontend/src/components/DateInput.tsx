type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
};

export function DateInput({ id, label, value, onChange, min, max, invalid = false, describedBy, className = '' }: Props) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`input ${invalid ? 'border-caution' : ''}`}
      />
    </div>
  );
}
