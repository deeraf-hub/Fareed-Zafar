import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Package, Pencil, Plus, X } from 'lucide-react';
import { api, type ListResponse } from '@/lib/api';
import type { Brand, Category, ProductListItem, Supplier } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { StockStatusBadge, StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { SortableHead, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useListQuery } from '@/hooks/use-list-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { downloadBlob, money, number } from '@/lib/utils';

export default function ProductsPage() {
  const { state, update, setSort, reset, activeFilterCount } = useListQuery({ sortBy: 'createdAt' });
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
    queryKey: ['products', query],
    queryFn: () => api.get<ListResponse<ProductListItem>>('/products', query),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ data: Category[] }>('/categories').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get<{ data: Brand[] }>('/brands').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.get<ListResponse<Supplier>>('/suppliers', { pageSize: 200 }).then((r) => r.data),
    enabled: can('supplier:view'),
    staleTime: 5 * 60_000,
  });

  const exportCsv = async () => {
    try {
      const { blob, filename } = await api.download('/reports/inventory', {}, 'products.csv');
      downloadBlob(blob, filename);
      toast.success('Export ready', 'Your inventory export has been downloaded.');
    } catch (err) {
      toast.error('Export failed', (err as Error).message);
    }
  };

  const products = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Products"
        description="Every item Brandsloop stocks, with live stock levels."
        breadcrumbs={[{ label: 'Products' }]}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            {can('product:create') ? (
              <Button asChild>
                <Link to="/products/new">
                  <Plus className="h-4 w-4" />
                  Add product
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={state.search}
            onChange={(value) => update({ search: value })}
            placeholder="Search by name, SKU or barcode…"
            className="lg:max-w-sm lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:ml-auto lg:flex">
            <Select
              value={state.filters.categoryId ?? 'all'}
              onChange={(event) => update({ categoryId: event.target.value })}
              aria-label="Filter by category"
              className="lg:w-[150px]"
            >
              <option value="all">All categories</option>
              {categories?.filter((c) => !c.parentId).map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
            <Select
              value={state.filters.brandId ?? 'all'}
              onChange={(event) => update({ brandId: event.target.value })}
              aria-label="Filter by brand"
              className="lg:w-[140px]"
            >
              <option value="all">All brands</option>
              {brands?.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </Select>
            {can('supplier:view') ? (
              <Select
                value={state.filters.supplierId ?? 'all'}
                onChange={(event) => update({ supplierId: event.target.value })}
                aria-label="Filter by supplier"
                className="lg:w-[150px]"
              >
                <option value="all">All suppliers</option>
                {suppliers?.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </Select>
            ) : null}
            <Select
              value={state.filters.status ?? 'all'}
              onChange={(event) => update({ status: event.target.value })}
              aria-label="Filter by status"
              className="lg:w-[130px]"
            >
              <option value="all">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DISCONTINUED">Discontinued</option>
            </Select>
          </div>
          {activeFilterCount > 0 || state.search ? (
            <Button variant="ghost" size="sm" onClick={reset} className="shrink-0">
              <X className="h-4 w-4" />
              Clear
            </Button>
          ) : null}
        </div>

        {isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={state.search || activeFilterCount ? 'No products match your filters' : 'No products yet'}
            description={
              state.search || activeFilterCount
                ? 'Try a different search or clear the filters.'
                : 'Add your first product to start tracking stock.'
            }
            action={
              state.search || activeFilterCount ? (
                <Button variant="outline" onClick={reset}>Clear filters</Button>
              ) : can('product:create') ? (
                <Button asChild>
                  <Link to="/products/new"><Plus className="h-4 w-4" />Add product</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {/* Mobile: cards. Desktop: table. */}
            <ul className="divide-y md:hidden">
              {products.map((product) => (
                <li key={product.id}>
                  <Link to={`/products/${product.id}`} className="flex items-start justify-between gap-3 p-4 active:bg-accent">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {product.sku} · {product.category?.name ?? 'Uncategorised'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StockStatusBadge status={product.stockStatus} />
                        <span className="text-xs text-muted-foreground">
                          {product.variantCount} variant{product.variantCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular">{number(product.totalStock)}</p>
                      <p className="text-xs text-muted-foreground">in stock</p>
                      <p className="mt-1 text-sm font-medium tabular">{money(product.sellingPrice)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <TableWrapper>
                <TableHeader>
                  <TableRow>
                    <SortableHead column="name" sortBy={state.sortBy} sortDir={state.sortDir} onSort={setSort}>Product</SortableHead>
                    <SortableHead column="sku" sortBy={state.sortBy} sortDir={state.sortDir} onSort={setSort}>SKU</SortableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Variants</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <SortableHead column="sellingPrice" sortBy={state.sortBy} sortDir={state.sortDir} onSort={setSort} className="text-right">
                      Price
                    </SortableHead>
                    <TableHead className="text-right">Retail value</TableHead>
                    <TableHead>Stock status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="max-w-[16rem]">
                        <Link to={`/products/${product.id}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                        {product.brand ? (
                          <p className="text-xs text-muted-foreground">{product.brand.name}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                      <TableCell className="text-muted-foreground">{product.category?.name ?? '—'}</TableCell>
                      <TableCell className="text-right tabular">{product.variantCount}</TableCell>
                      <TableCell className="text-right font-medium tabular">{number(product.totalStock)}</TableCell>
                      <TableCell className="text-right tabular">{money(product.sellingPrice)}</TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">{money(product.retailValue)}</TableCell>
                      <TableCell><StockStatusBadge status={product.stockStatus} /></TableCell>
                      <TableCell><StatusBadge status={product.status} /></TableCell>
                      <TableCell>
                        {can('product:update') ? (
                          <Button variant="ghost" size="icon-sm" asChild aria-label={`Edit ${product.name}`}>
                            <Link to={`/products/${product.id}/edit`}><Pencil className="h-4 w-4" /></Link>
                          </Button>
                        ) : null}
                      </TableCell>
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
