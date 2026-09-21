export type SelectOption = { value: string; label: string };

type Props = {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Adds an initial option with an empty value. */
  placeholder?: string;
  hideLabel?: boolean;
  inline?: boolean;
  disabled?: boolean;
  className?: string;
};

export function Select({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  hideLabel = false,
  inline = false,
  disabled = false,
  className = '',
}: Props) {
  return (
    <div className={`${inline ? 'flex items-center gap-2' : ''} ${className}`}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : inline ? 'text-sm text-ink-secondary' : 'label'}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`input ${inline ? 'w-auto' : ''}`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
