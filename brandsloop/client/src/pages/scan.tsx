import * as React from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ImageOff, ScanBarcode, Search } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { StockStatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/states';
import { useAuth } from '@/hooks/use-auth';
import { money, number, variantLabel } from '@/lib/utils';
import { stockStatusFor } from '@/lib/stock-status';

interface LookupResult {
  variantId: string;
  productId: string;
  productName: string;
  productSku: string;
  imageUrl: string | null;
  category: string | null;
  supplier: string | null;
  sku: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  costPrice: number;
  sellingPrice: number;
  totalStock: number;
  stockByLocation: {
    locationId: string;
    location: { id: string; name: string; code: string };
    quantity: number;
    reserved: number;
    damaged: number;
  }[];
}

export default function ScanPage() {
  const { can } = useAuth();
  const [code, setCode] = React.useState('');
  const [result, setResult] = React.useState<LookupResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const lookup = useMutation({
    mutationFn: (value: string) =>
      api.get<{ data: LookupResult }>(`/inventory/lookup/${encodeURIComponent(value)}`).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setCode('');
      inputRef.current?.focus();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not look that code up.');
      setResult(null);
    },
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = code.trim();
    if (value) lookup.mutate(value);
  };

  const showCost = can('report:financial');

  return (
    <>
      <PageHeader
        title="Scan / lookup"
        description="Scan a barcode or type an SKU to see stock, prices and where the item is."
        breadcrumbs={[{ label: 'Scan' }]}
      />

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Barcode or SKU</CardTitle>
            <CardDescription>
              A handheld scanner works like a keyboard — the field stays focused so you can scan one item after another.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="relative">
                <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  autoFocus
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Scan or type a code…"
                  className="h-12 pl-11 font-mono text-base"
                  aria-label="Barcode or SKU"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" className="w-full" loading={lookup.isPending} disabled={!code.trim()}>
                <Search className="h-4 w-4" />
                Look up
              </Button>
            </form>

            {error ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="min-w-0">
          {!result ? (
            <Card>
              <EmptyState
                icon={ScanBarcode}
                title="Nothing scanned yet"
                description="Scan a product barcode, or type an SKU and press Enter."
              />
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {result.imageUrl ? (
                      <img src={result.imageUrl} alt={result.productName} className="h-full w-full object-cover" />
                    ) : (
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${result.productId}`} className="text-xl font-semibold hover:underline">
                      {result.productName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {variantLabel(result)} · {result.category ?? 'Uncategorised'}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {result.sku}
                      {result.barcode ? ` · ${result.barcode}` : ''}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Selling price</p>
                        <p className="text-2xl font-semibold tabular">{money(result.sellingPrice)}</p>
                      </div>
                      {showCost ? (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cost price</p>
                          <p className="text-lg font-medium tabular">{money(result.costPrice)}</p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total stock</p>
                        <p className="text-2xl font-semibold tabular">{number(result.totalStock)}</p>
                      </div>
                      <StockStatusBadge status={stockStatusFor(result.totalStock)} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t pt-5">
                  <p className="mb-3 text-sm font-medium">Stock by location</p>
                  {result.stockByLocation.length === 0 ? (
                    <p className="text-sm text-muted-foreground">This item is not stocked anywhere yet.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {result.stockByLocation.map((row) => (
                        <div key={row.locationId} className="rounded-lg border p-3">
                          <p className="font-medium">{row.location.name}</p>
                          <p className="mt-1 text-2xl font-semibold tabular">{number(row.quantity)}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.reserved > 0 ? `${row.reserved} reserved · ` : ''}
                            {row.damaged > 0 ? `${row.damaged} damaged` : 'available'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t pt-5">
                  <Button variant="outline" asChild>
                    <Link to={`/products/${result.productId}`}>Open product</Link>
                  </Button>
                  {can('sale:create') ? (
                    <Button asChild><Link to="/sales/new">Start a sale</Link></Button>
                  ) : null}
                  {can('inventory:view') ? (
                    <Button variant="outline" asChild>
                      <Link to={`/inventory?search=${encodeURIComponent(result.sku)}`}>View in inventory</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
