import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Plus, ShoppingCart, X } from 'lucide-react';
import { api, type ListResponse } from '@/lib/api';
import type { Location, Purchase, Supplier } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useListQuery } from '@/hooks/use-list-query';
import { useAuth } from '@/hooks/use-auth';
import { downloadBlob, formatDate, money } from '@/lib/utils';

export default function PurchasesPage() {
  const { state, update, reset, activeFilterCount } = useListQuery();
  const { can } = useAuth();
  const toast = useToast();

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, sortDir: state.sortDir, ...state.filters };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchases', query],
    queryFn: () => api.get<ListResponse<Purchase>>('/purchases', query),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.get<ListResponse<Supplier>>('/suppliers', { pageSize: 200 }).then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const exportCsv = async () => {
    try {
      const { blob, filename } = await api.download(
        '/reports/purchases',
        { ...state.filters, range: 'custom', from: state.filters.from, to: state.filters.to, limit: 5000 },
        'purchases.csv',
      );
      downloadBlob(blob, filename);
      toast.success('Export ready');
    } catch (err) {
      toast.error('Export failed', (err as Error).message);
    }
  };

  const purchases = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Stock ordered from suppliers, and what has arrived."
        breadcrumbs={[{ label: 'Purchases' }]}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            {can('purchase:create') ? (
              <Button asChild>
                <Link to="/purchases/new"><Plus className="h-4 w-4" />New purchase</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <Card>
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              value={state.search}
              onChange={(value) => update({ search: value })}
              placeholder="Search purchase number or supplier…"
              className="lg:max-w-sm lg:flex-1"
            />
            {activeFilterCount > 0 || state.search ? (
              <Button variant="ghost" size="sm" onClick={reset} className="self-start lg:ml-auto">
                <X className="h-4 w-4" />Clear filters
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <Select value={state.filters.status ?? 'all'} onChange={(event) => update({ status: event.target.value })} aria-label="Status">
              <option value="all">Any status</option>
              <option value="DRAFT">Draft</option>
              <option value="ORDERED">Ordered</option>
              <option value="PARTIALLY_RECEIVED">Partially received</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
            <Select value={state.filters.supplierId ?? 'all'} onChange={(event) => update({ supplierId: event.target.value })} aria-label="Supplier">
              <option value="all">All suppliers</option>
              {suppliers?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </Select>
            <Select value={state.filters.paymentStatus ?? 'all'} onChange={(event) => update({ paymentStatus: event.target.value })} aria-label="Payment status">
              <option value="all">Any payment</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partially paid</option>
              <option value="PAID">Paid</option>
            </Select>
            <Input type="date" value={state.filters.from ?? ''} onChange={(event) => update({ from: event.target.value })} aria-label="From date" />
            <Input type="date" value={state.filters.to ?? ''} onChange={(event) => update({ to: event.target.value })} aria-label="To date" />
          </div>
        </div>

        {isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={activeFilterCount || state.search ? 'No purchases match your filters' : 'No purchases yet'}
            description={activeFilterCount || state.search ? 'Try clearing the filters.' : 'Raise your first purchase order to bring stock in.'}
            action={
              can('purchase:create') ? (
                <Button asChild><Link to="/purchases/new"><Plus className="h-4 w-4" />New purchase</Link></Button>
              ) : null
            }
          />
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {purchases.map((purchase) => (
                <li key={purchase.id}>
                  <Link to={`/purchases/${purchase.id}`} className="block p-4 active:bg-accent">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">{purchase.number}</p>
                        <p className="truncate text-sm">{purchase.supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(purchase.orderDate)} · {purchase.location.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold tabular">{money(purchase.total)}</p>
                        <div className="mt-1"><StatusBadge status={purchase.status} /></div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <TableWrapper>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purchase #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <Link to={`/purchases/${purchase.id}`} className="font-mono text-sm font-medium hover:underline">
                          {purchase.number}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(purchase.orderDate)}</TableCell>
                      <TableCell>{purchase.supplier.name}</TableCell>
                      <TableCell className="text-muted-foreground">{purchase.location.name}</TableCell>
                      <TableCell className="text-right tabular">{purchase._count?.items ?? 0}</TableCell>
                      <TableCell className="text-right font-medium tabular">{money(purchase.total)}</TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">
                        {money(purchase.total - purchase.paidAmount)}
                      </TableCell>
                      <TableCell><StatusBadge status={purchase.paymentStatus} /></TableCell>
                      <TableCell><StatusBadge status={purchase.status} /></TableCell>
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
