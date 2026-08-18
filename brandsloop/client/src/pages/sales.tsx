import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Plus, ShoppingBag, X } from 'lucide-react';
import { api, type ListResponse } from '@/lib/api';
import type { Location, Sale } from '@/types';
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
import { downloadBlob, formatDate, humanize, money } from '@/lib/utils';

export default function SalesPage() {
  const { state, update, reset, activeFilterCount } = useListQuery();
  const { can } = useAuth();
  const toast = useToast();

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, sortDir: state.sortDir, ...state.filters };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sales', query],
    queryFn: () => api.get<ListResponse<Sale>>('/sales', query),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const exportCsv = async () => {
    try {
      const { blob, filename } = await api.download(
        '/reports/sales',
        { ...state.filters, range: 'custom', from: state.filters.from, to: state.filters.to, limit: 5000 },
        'sales.csv',
      );
      downloadBlob(blob, filename);
      toast.success('Export ready');
    } catch (err) {
      toast.error('Export failed', (err as Error).message);
    }
  };

  const sales = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Sales"
        description="Everything sold, with stock deducted automatically."
        breadcrumbs={[{ label: 'Sales' }]}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            {can('sale:create') ? (
              <Button asChild><Link to="/sales/new"><Plus className="h-4 w-4" />New sale</Link></Button>
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
              placeholder="Search sale number, customer or phone…"
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
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
            <Select value={state.filters.locationId ?? 'all'} onChange={(event) => update({ locationId: event.target.value })} aria-label="Location">
              <option value="all">All locations</option>
              {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
            <Select value={state.filters.paymentMethod ?? 'all'} onChange={(event) => update({ paymentMethod: event.target.value })} aria-label="Payment method">
              <option value="all">Any payment method</option>
              {['CASH', 'CARD', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'OTHER'].map((method) => (
                <option key={method} value={method}>{humanize(method)}</option>
              ))}
            </Select>
            <Input type="date" value={state.filters.from ?? ''} onChange={(event) => update({ from: event.target.value })} aria-label="From date" />
            <Input type="date" value={state.filters.to ?? ''} onChange={(event) => update({ to: event.target.value })} aria-label="To date" />
          </div>
        </div>

        {isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={activeFilterCount || state.search ? 'No sales match your filters' : 'No sales recorded yet'}
            description={activeFilterCount || state.search ? 'Try clearing the filters.' : 'Record your first sale to start tracking revenue.'}
            action={can('sale:create') ? <Button asChild><Link to="/sales/new"><Plus className="h-4 w-4" />New sale</Link></Button> : null}
          />
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {sales.map((sale) => (
                <li key={sale.id}>
                  <Link to={`/sales/${sale.id}`} className="block p-4 active:bg-accent">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">{sale.number}</p>
                        <p className="truncate text-sm">{sale.customer?.name ?? 'Walk-in customer'}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(sale.saleDate)} · {humanize(sale.paymentMethod)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold tabular">{money(sale.total)}</p>
                        <div className="mt-1"><StatusBadge status={sale.status} /></div>
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
                    <TableHead>Sale #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sold by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <Link to={`/sales/${sale.id}`} className="font-mono text-sm font-medium hover:underline">{sale.number}</Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(sale.saleDate)}</TableCell>
                      <TableCell>{sale.customer?.name ?? <span className="text-muted-foreground">Walk-in</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{sale.location.name}</TableCell>
                      <TableCell className="text-right tabular">{sale._count?.items ?? 0}</TableCell>
                      <TableCell className="text-right font-medium tabular">{money(sale.total)}</TableCell>
                      <TableCell className="text-muted-foreground">{humanize(sale.paymentMethod)}</TableCell>
                      <TableCell><StatusBadge status={sale.paymentStatus} /></TableCell>
                      <TableCell><StatusBadge status={sale.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{sale.createdBy?.name ?? '—'}</TableCell>
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
