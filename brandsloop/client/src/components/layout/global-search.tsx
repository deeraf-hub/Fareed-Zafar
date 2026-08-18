import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useDebounced } from '@/hooks/use-list-query';
import { money } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SearchResults {
  products: { id: string; name: string; sku: string; href: string }[];
  variants: { id: string; sku: string; label: string; sellingPrice: number; stock: number; href: string }[];
  categories: { id: string; name: string; href: string }[];
  suppliers: { id: string; name: string; phone: string | null; href: string }[];
  customers: { id: string; name: string; phone: string | null; href: string }[];
  sales: { id: string; number: string; total: number; href: string }[];
  purchases: { id: string; number: string; total: number; href: string }[];
}

interface Flat {
  key: string;
  group: string;
  title: string;
  subtitle: string;
  href: string;
}

function flatten(results: SearchResults | undefined): Flat[] {
  if (!results) return [];
  return [
    ...results.products.map((item) => ({
      key: `p-${item.id}`, group: 'Products', title: item.name, subtitle: item.sku, href: item.href,
    })),
    ...results.variants.map((item) => ({
      key: `v-${item.id}`, group: 'Variants', title: item.label,
      subtitle: `${item.sku} · ${item.stock} in stock · ${money(item.sellingPrice)}`, href: item.href,
    })),
    ...results.categories.map((item) => ({
      key: `c-${item.id}`, group: 'Categories', title: item.name, subtitle: 'Category', href: item.href,
    })),
    ...results.suppliers.map((item) => ({
      key: `s-${item.id}`, group: 'Suppliers', title: item.name, subtitle: item.phone ?? 'Supplier', href: item.href,
    })),
    ...results.customers.map((item) => ({
      key: `cu-${item.id}`, group: 'Customers', title: item.name, subtitle: item.phone ?? 'Customer', href: item.href,
    })),
    ...results.sales.map((item) => ({
      key: `sa-${item.id}`, group: 'Sales', title: item.number, subtitle: money(item.total), href: item.href,
    })),
    ...results.purchases.map((item) => ({
      key: `pu-${item.id}`, group: 'Purchases', title: item.number, subtitle: money(item.total), href: item.href,
    })),
  ];
}

/**
 * Command-bar search over products, variants, SKUs, barcodes, people and
 * documents. Opens with Ctrl/Cmd+K and is fully keyboard-driven.
 */
export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [term, setTerm] = React.useState('');
  const [cursor, setCursor] = React.useState(0);
  const debounced = useDebounced(term, 250);

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => api.get<{ data: SearchResults }>('/search', { q: debounced }).then((r) => r.data),
    enabled: debounced.trim().length >= 2,
  });

  const results = React.useMemo(() => flatten(data), [data]);

  React.useEffect(() => setCursor(0), [debounced]);
  React.useEffect(() => {
    if (!open) setTerm('');
  }, [open]);

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && results[cursor]) {
      event.preventDefault();
      go(results[cursor].href);
    }
  };

  let lastGroup = '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] max-w-xl translate-y-0 gap-0 p-0" size="md">
        <DialogTitle className="sr-only">Search Brandsloop</DialogTitle>
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search products, SKUs, barcodes, suppliers, sale numbers…"
            className="h-14 border-0 pl-11 pr-11 text-base shadow-none focus-visible:ring-0"
          />
          {isFetching ? (
            <Loader2 className="absolute right-11 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin p-2">
          {debounced.trim().length < 2 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search.
            </p>
          ) : results.length === 0 && !isFetching ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nothing matched “{debounced}”.
            </p>
          ) : (
            <ul>
              {results.map((item, index) => {
                const showGroup = item.group !== lastGroup;
                lastGroup = item.group;
                return (
                  <React.Fragment key={item.key}>
                    {showGroup ? (
                      <li className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {item.group}
                      </li>
                    ) : null}
                    <li>
                      <button
                        type="button"
                        onMouseEnter={() => setCursor(index)}
                        onClick={() => go(item.href)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                          index === cursor ? 'bg-accent' : 'hover:bg-accent/60',
                        )}
                      >
                        <span className="min-w-0 truncate font-medium">{item.title}</span>
                        <span className="shrink-0 truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      </button>
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3 border-t px-4 py-2.5 text-[11px] text-muted-foreground">
          <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans">↵</kbd> open</span>
          <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
