import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Package, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { VariantOption } from '@/types';
import { Input } from '@/components/ui/input';
import { useDebounced } from '@/hooks/use-list-query';
import { cn, money, variantLabel } from '@/lib/utils';

interface VariantPickerProps {
  locationId?: string;
  onPick: (variant: VariantOption) => void;
  /** Shows the stock held at `locationId` — hide it where stock is irrelevant. */
  showStock?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Type-ahead product picker used by the sale, purchase, transfer, adjustment
 * and stock-count forms. Scanning a barcode into it works too: the API matches
 * barcodes as well as SKUs and names, and an exact single match is selected
 * automatically on Enter.
 */
export function VariantPicker({
  locationId,
  onPick,
  showStock = true,
  placeholder = 'Search or scan a product, SKU or barcode…',
  autoFocus,
}: VariantPickerProps) {
  const [term, setTerm] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const debounced = useDebounced(term, 250);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['variant-options', debounced, locationId],
    queryFn: () =>
      api
        .get<{ data: VariantOption[] }>('/inventory/variants', {
          search: debounced,
          locationId,
          limit: 20,
        })
        .then((r) => r.data),
    enabled: open,
  });

  const options = data ?? [];

  React.useEffect(() => setCursor(0), [debounced]);

  React.useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const choose = (variant: VariantOption) => {
    onPick(variant);
    setTerm('');
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((current) => Math.min(current + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // A scanner types the code then presses Enter: if exactly one thing
      // matches, take it without needing the arrow keys.
      const exact = options.find(
        (option) => option.barcode === term.trim() || option.sku === term.trim(),
      );
      const chosen = exact ?? options[cursor];
      if (chosen) choose(chosen);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        value={term}
        autoFocus={autoFocus}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
        autoComplete="off"
      />
      {isFetching ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : null}

      {open ? (
        <div className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto scrollbar-thin rounded-lg border bg-popover p-1 shadow-lg">
          {options.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {isFetching ? 'Searching…' : 'No products found.'}
            </p>
          ) : (
            <ul>
              {options.map((option, index) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => choose(option)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                      index === cursor ? 'bg-accent' : 'hover:bg-accent/60',
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                      {option.imageUrl ? (
                        <img src={option.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{option.productName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {variantLabel(option)} · {option.sku}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-medium tabular">{money(option.sellingPrice)}</span>
                      {showStock ? (
                        <span
                          className={cn(
                            'block text-xs tabular',
                            option.available > 0 ? 'text-muted-foreground' : 'text-destructive',
                          )}
                        >
                          {option.available} available
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
