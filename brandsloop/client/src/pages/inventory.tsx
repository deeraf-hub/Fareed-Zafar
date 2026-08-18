import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Banknote, Boxes, Download, PackageX, X } from 'lucide-react';
import { api, type ListResponse } from '@/lib/api';
import type { Category, InventoryRow, Location, Supplier } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { StatCard } from '@/components/shared/stat-card';
import { StockStatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { SortableHead, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { CardSkeleton, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useListQuery } from '@/hooks/use-list-query';
import { useAuth } from '@/hooks/use-auth';
import { downloadBlob, money, number, variantLabel } from '@/lib/utils';

export default function InventoryPage() {
  const { state, update, setSort, reset, activeFilterCount } = useListQuery({ sortBy: 'product', sortDir: 'asc' });
  const { can } = useAuth();
  const toast = useToast();

  const query = {
    page: state.page,
    pageSize: state.pageSize,
    search: state.search,
    sortBy: state.sortBy,
    sortDir: state.sortDir,
    ...state.filters,
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inventory', query],
    queryFn: () => api.get<ListResponse<InventoryRow>>('/inventory', query),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['inventory-summary', state.filters.locationId],
    queryFn: () =>
      api
        .get<{ data: any }>('/inventory/summary', { locationId: state.filters.locationId })
        .then((r) => r.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ data: Category[] }>('/categories').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.get<ListResponse<Supplier>>('/suppliers', { pageSize: 200 }).then((r) => r.data),
    enabled: can('supplier:view'),
    staleTime: 5 * 60_000,
  });
  const { data: filters } = useQuery({
    queryKey: ['inventory-filters'],
    queryFn: () => api.get<{ data: { sizes: string[]; colors: string[] } }>('/inventory/filters').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const exportCsv = async () => {
    try {
      const { blob, filename } = await api.download('/reports/inventory', { ...state.filters, limit: 5000 }, 'inventory.csv');
      downloadBlob(blob, filename);
      toast.success('Export ready', 'Your inventory export honours the current filters.');
    } catch (err) {
      toast.error('Export failed', (err as Error).message);
    }
  };

  const rows = data?.data ?? [];
  const showMoney = can('report:financial');

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Live stock for every variant, at every location."
        breadcrumbs={[{ label: 'Inventory' }]}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/inventory/movements">Stock movements</Link>
            </Button>
          </>
        }
      />

      {summaryLoading || !summary ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Stock units" value={number(summary.totalUnits)} hint={`${summary.variantCount} variants`} icon={Boxes} tone="info" />
          {showMoney ? (
            <StatCard
              label="Stock value"
              value={money(summary.costValue, { compact: true })}
              hint={`Retail ${money(summary.retailValue, { compact: true })}`}
              icon={Banknote}
              tone="success"
            />
          ) : null}
          <StatCard
            label="Low stock"
            value={number(summary.lowStock)}
            hint={
              state.filters.locationId
                ? 'Variants at or below reorder level here'
                : 'Variants at or below reorder level, all locations'
            }
            icon={AlertTriangle}
            tone={summary.lowStock > 0 ? 'warning' : 'default'}
            to="/inventory?status=LOW_STOCK"
          />
          <StatCard
            label="Out of stock"
            value={number(summary.outOfStock)}
            hint={state.filters.locationId ? 'Nothing on hand here' : 'Nothing on hand anywhere'}
            icon={PackageX}
            tone={summary.outOfStock > 0 ? 'danger' : 'default'}
            to="/inventory?status=OUT_OF_STOCK"
          />
        </div>
      )}

      <Card>
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              value={state.search}
              onChange={(value) => update({ search: value })}
              placeholder="Search product, SKU, barcode, colour…"
              className="lg:max-w-sm lg:flex-1"
            />
            {activeFilterCount > 0 || state.search ? (
              <Button variant="ghost" size="sm" onClick={reset} className="self-start lg:ml-auto">
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Select value={state.filters.locationId ?? 'all'} onChange={(event) => update({ locationId: event.target.value })} aria-label="Location">
              <option value="all">All locations</option>
              {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
            <Select value={state.filters.categoryId ?? 'all'} onChange={(event) => update({ categoryId: event.target.value })} aria-label="Category">
              <option value="all">All categories</option>
              {categories?.filter((c) => !c.parentId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
            {can('supplier:view') ? (
              <Select value={state.filters.supplierId ?? 'all'} onChange={(event) => update({ supplierId: event.target.value })} aria-label="Supplier">
                <option value="all">All suppliers</option>
                {suppliers?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </Select>
            ) : null}
            <Select value={state.filters.size ?? 'all'} onChange={(event) => update({ size: event.target.value })} aria-label="Size">
              <option value="all">All sizes</option>
              {filters?.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </Select>
            <Select value={state.filters.color ?? 'all'} onChange={(event) => update({ color: event.target.value })} aria-label="Colour">
              <option value="all">All colours</option>
              {filters?.colors.map((color) => <option key={color} value={color}>{color}</option>)}
            </Select>
            <Select value={state.filters.status ?? 'all'} onChange={(event) => update({ status: event.target.value })} aria-label="Stock status">
              <option value="all">Any stock status</option>
              <option value="IN_STOCK">In stock</option>
              <option value="LOW_STOCK">Low stock</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
              <option value="OVERSTOCK">Overstock</option>
            </Select>
          </div>
        </div>

        {isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={10} columns={7} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No stock matches your filters"
            description="Try widening the search, or clear the filters."
            action={<Button variant="outline" onClick={reset}>Clear filters</Button>}
          />
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {rows.map((row) => (
                <li key={`${row.variantId}-${row.locationId ?? 'none'}`} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/products/${row.productId}`} className="block truncate font-medium hover:underline">
                        {row.productName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.variantSku} · {variantLabel(row)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.locationName ?? 'Not stocked'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular">{number(row.quantity)}</p>
                      <p className="text-xs text-muted-foreground">min {row.minStock}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <StockStatusBadge status={row.status} />
                    <span className="text-sm tabular text-muted-foreground">{money(row.sellingPrice)}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <TableWrapper>
                <TableHeader>
                  <TableRow>
                    <SortableHead column="product" sortBy={state.sortBy} sortDir={state.sortDir} onSort={setSort}>Product</SortableHead>
                    <SortableHead column="sku" sortBy={state.sortBy} sortDir={state.sortDir} onSort={setSort}>SKU</SortableHead>
                    <TableHead>Variant</TableHead>
                    <SortableHead column="location" sortBy={state.sortBy} sortDir={state.sortDir} onSort={setSort}>Location</SortableHead>
                    <SortableHead column="quantity" sortBy={state.sortBy} sortDir={state.sortDir} onSort={setSort} className="text-right">Stock</SortableHead>
                    <TableHead className="text-right">Min stock</TableHead>
                    {showMoney ? <TableHead className="text-right">Cost</TableHead> : null}
                    <TableHead className="text-right">Retail</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.variantId}-${row.locationId ?? 'none'}`}>
                      <TableCell className="max-w-[15rem]">
                        <Link to={`/products/${row.productId}`} className="font-medium hover:underline">
                          {row.productName}
                        </Link>
                        {row.categoryName ? <p className="text-xs text-muted-foreground">{row.categoryName}</p> : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{row.variantSku}</TableCell>
                      <TableCell>{variantLabel(row)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.locationName ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium tabular">
                        {number(row.quantity)}
                        {row.damaged > 0 ? <span className="ml-1 text-xs text-destructive">+{row.damaged} dmg</span> : null}
                      </TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">{row.minStock}</TableCell>
                      {showMoney ? <TableCell className="text-right tabular">{money(row.costPrice)}</TableCell> : null}
                      <TableCell className="text-right tabular">{money(row.sellingPrice)}</TableCell>
                      <TableCell><StockStatusBadge status={row.status} /></TableCell>
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
