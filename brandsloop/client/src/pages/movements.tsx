import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, FileClock, X } from 'lucide-react';
import { api, type ListResponse } from '@/lib/api';
import type { Location, StockMovement } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { MovementBadge, QuantityDelta } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useListQuery } from '@/hooks/use-list-query';
import { downloadBlob, formatDate, variantLabel } from '@/lib/utils';

const MOVEMENT_TYPES = [
  'PURCHASE', 'SALE', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN', 'ADJUSTMENT',
  'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGED', 'LOST', 'OPENING_STOCK',
  'STOCK_COUNT', 'SALE_CANCELLED', 'PURCHASE_CANCELLED',
];

export default function MovementsPage() {
  const { state, update, reset, activeFilterCount } = useListQuery();
  const toast = useToast();

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, sortDir: state.sortDir, ...state.filters };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['movements', query],
    queryFn: () => api.get<ListResponse<StockMovement>>('/inventory/movements', query),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const exportCsv = async () => {
    try {
      const { blob, filename } = await api.download(
        '/reports/stock-movements',
        { ...state.filters, range: 'custom', from: state.filters.from, to: state.filters.to, limit: 5000 },
        'stock-movements.csv',
      );
      downloadBlob(blob, filename);
      toast.success('Export ready');
    } catch (err) {
      toast.error('Export failed', (err as Error).message);
    }
  };

  const movements = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Stock movements"
        description="Every change to stock, with who did it and why."
        breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: 'Stock movements' }]}
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />

      <Card>
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              value={state.search}
              onChange={(value) => update({ search: value })}
              placeholder="Search product, SKU, reference or note…"
              className="lg:max-w-sm lg:flex-1"
            />
            {activeFilterCount > 0 || state.search ? (
              <Button variant="ghost" size="sm" onClick={reset} className="self-start lg:ml-auto">
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Select value={state.filters.type ?? 'all'} onChange={(event) => update({ type: event.target.value })} aria-label="Movement type">
              <option value="all">All movement types</option>
              {MOVEMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}</option>
              ))}
            </Select>
            <Select value={state.filters.locationId ?? 'all'} onChange={(event) => update({ locationId: event.target.value })} aria-label="Location">
              <option value="all">All locations</option>
              {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
            <Input type="date" value={state.filters.from ?? ''} onChange={(event) => update({ from: event.target.value })} aria-label="From date" />
            <Input type="date" value={state.filters.to ?? ''} onChange={(event) => update({ to: event.target.value })} aria-label="To date" />
          </div>
        </div>

        {isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={10} columns={7} />
        ) : movements.length === 0 ? (
          <EmptyState icon={FileClock} title="No stock movements found" description="Adjust the filters to see more." />
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {movements.map((movement) => (
                <li key={movement.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/products/${movement.variant.product.id}`} className="block truncate font-medium hover:underline">
                        {movement.variant.product.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {movement.variant.sku} · {variantLabel(movement.variant)}
                      </p>
                    </div>
                    <QuantityDelta value={movement.quantity} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <MovementBadge type={movement.type} />
                    <span>{movement.location.name}</span>
                    <span>·</span>
                    <span>{formatDate(movement.createdAt, true)}</span>
                    <span>·</span>
                    <span>{movement.user?.name ?? 'System'}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <TableWrapper>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date &amp; time</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Before → after</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(movement.createdAt, true)}</TableCell>
                      <TableCell className="max-w-[14rem]">
                        <Link to={`/products/${movement.variant.product.id}`} className="font-medium hover:underline">
                          {movement.variant.product.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{movement.variant.sku}</TableCell>
                      <TableCell>{variantLabel(movement.variant)}</TableCell>
                      <TableCell><MovementBadge type={movement.type} /></TableCell>
                      <TableCell className="text-muted-foreground">{movement.location.name}</TableCell>
                      <TableCell className="text-right"><QuantityDelta value={movement.quantity} /></TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">
                        {movement.previousQty} → {movement.newQty}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{movement.referenceNumber ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{movement.user?.name ?? 'System'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableWrapper>
            </div>

            <Pagination
              meta={data?.meta}
              onPageChange={(page) => update({ page }, false)}
              onPageSizeChange={(pageSize) => update({ pageSize })}
            />
          </>
        )}
      </Card>
    </>
  );
}
