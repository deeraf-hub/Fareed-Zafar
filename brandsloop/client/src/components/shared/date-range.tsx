import { CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
] as const;

interface DateRangePickerProps {
  range: string;
  from?: string;
  to?: string;
  onChange: (patch: { range?: string; from?: string; to?: string }) => void;
}

export function DateRangePicker({ range, from, to, onChange }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Select
          className="w-[178px] pl-9"
          value={range}
          onChange={(event) => onChange({ range: event.target.value })}
          aria-label="Date range"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      {range === 'custom' ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-[150px]"
            value={from ?? ''}
            onChange={(event) => onChange({ from: event.target.value })}
            aria-label="From date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-[150px]"
            value={to ?? ''}
            onChange={(event) => onChange({ to: event.target.value })}
            aria-label="To date"
          />
        </div>
      ) : null}
    </div>
  );
}
