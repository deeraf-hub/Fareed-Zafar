import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Banknote, ImageOff, Pencil, TrendingUp, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { MovementBadge, QuantityDelta, StatusBadge, StockStatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, money, number, variantLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Tab = 'variants' | 'movements' | 'purchases' | 'sales' | 'returns';

const TABS: { id: Tab; label: string }[] = [
  { id: 'variants', label: 'Variants & stock' },
  { id: 'movements', label: 'Stock history' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'sales', label: 'Sales' },
  { id: 'returns', label: 'Returns' },
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [tab, setTab] = React.useState<Tab>('variants');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<{ data: any }>(`/products/${id}`).then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: () => api.delete<{ discontinued: boolean; message?: string }>(`/products/${id}`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (response.discontinued) {
        toast.toast({
          title: 'Marked as discontinued',
          description: response.message,
          variant: 'warning',
        });
        refetch();
      } else {
        toast.success('Product deleted');
        navigate('/products');
      }
    },
    onError: (err) => toast.error('Could not delete the product', (err as Error).message),
  });

  const onDelete = async () => {
    const confirmed = await confirm({
      title: `Delete ${data?.name}?`,
      description:
        'If this product has any stock history it will be marked as discontinued instead, so its records stay auditable.',
      confirmLabel: 'Delete product',
      destructive: true,
    });
    if (confirmed) remove.mutate();
  };

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={data.name}
        description={[data.category?.name, data.brand?.name].filter(Boolean).join(' · ') || undefined}
        breadcrumbs={[{ label: 'Products', to: '/products' }, { label: data.name }]}
        actions={
          <>
            {can('product:update') ? (
              <Button variant="outline" asChild>
                <Link to={`/products/${id}/edit`}><Pencil className="h-4 w-4" />Edit</Link>
              </Button>
            ) : null}
            {can('product:delete') ? (
              <Button variant="destructive" onClick={onDelete} loading={remove.isPending}>
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">
                {data.imageUrl ? (
                  <img src={data.imageUrl} alt={data.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-10 w-10 text-muted-foreground" aria-hidden />
                )}
              </div>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">SKU</dt>
                  <dd className="font-mono text-xs">{data.sku}</dd>
                </div>
                {data.barcode ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Barcode</dt>
                    <dd className="font-mono text-xs">{data.barcode}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd><StatusBadge status={data.status} /></dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Cost price</dt>
                  <dd className="tabular">{money(data.costPrice)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Selling price</dt>
                  <dd className="font-medium tabular">{money(data.sellingPrice)}</dd>
                </div>
                {data.wholesalePrice != null ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Wholesale</dt>
                    <dd className="tabular">{money(data.wholesalePrice)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Supplier</dt>
                  <dd className="text-right">
                    {data.supplier ? (
                      <Link to={`/suppliers/${data.supplier.id}`} className="hover:underline">{data.supplier.name}</Link>
                    ) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Min / reorder</dt>
                  <dd className="tabular">{data.minStock} / {data.reorderLevel}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDate(data.createdAt)}</dd>
                </div>
              </dl>
              {data.description ? (
                <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{data.description}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total stock" value={number(data.totals.totalStock)} icon={Boxes} tone="info" />
            <StatCard label="Stock value (cost)" value={money(data.totals.costValue, { compact: true })} icon={Banknote} />
            <StatCard
              label="Potential profit"
              value={money(data.totals.potentialProfit, { compact: true })}
              hint={`Retail ${money(data.totals.retailValue, { compact: true })}`}
              icon={TrendingUp}
              tone="success"
            />
          </div>

          <Card>
            <div className="flex gap-1 overflow-x-auto scrollbar-thin border-b px-2">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                    tab === item.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'variants' ? (
              data.variants.length === 0 ? (
                <EmptyState title="No variants" description="Add variants so stock can be tracked per size and colour." />
              ) : (
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>By location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.variants.map((variant: any) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variantLabel(variant)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{variant.sku}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{variant.barcode ?? '—'}</TableCell>
                        <TableCell className="text-right tabular">{money(variant.costPrice)}</TableCell>
                        <TableCell className="text-right tabular">{money(variant.sellingPrice)}</TableCell>
                        <TableCell className="text-right font-medium tabular">
                          {number(variant.totalStock)}
                          {variant.damaged > 0 ? (
                            <span className="ml-1 text-xs text-destructive">({variant.damaged} damaged)</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {variant.stockByLocation.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Not stocked</span>
                            ) : (
                              variant.stockByLocation.map((row: any) => (
                                <span key={row.locationId} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                  {row.location.code} {row.quantity}
                                </span>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell><StockStatusBadge status={variant.stockStatus} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableWrapper>
              )
            ) : null}

            {tab === 'movements' ? (
              data.movements.length === 0 ? (
                <EmptyState title="No stock movements yet" />
              ) : (
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
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
                    {data.movements.map((movement: any) => (
                      <TableRow key={movement.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(movement.createdAt, true)}</TableCell>
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
              )
            ) : null}

            {tab === 'purchases' ? (
              data.purchaseHistory.length === 0 ? (
                <EmptyState title="Never purchased" description="This product has not been bought in yet." />
              ) : (
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Purchase</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.purchaseHistory.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link to={`/purchases/${item.purchase.id}`} className="font-mono text-xs hover:underline">
                            {item.purchase.number}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(item.purchase.orderDate)}</TableCell>
                        <TableCell>{item.purchase.supplier.name}</TableCell>
                        <TableCell>{variantLabel(item.variant)}</TableCell>
                        <TableCell className="text-right tabular">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular">{item.receivedQty}</TableCell>
                        <TableCell className="text-right tabular">{money(item.unitCost)}</TableCell>
                        <TableCell><StatusBadge status={item.purchase.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableWrapper>
              )
            ) : null}

            {tab === 'sales' ? (
              data.salesHistory.length === 0 ? (
                <EmptyState title="No sales yet" />
              ) : (
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.salesHistory.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link to={`/sales/${item.sale.id}`} className="font-mono text-xs hover:underline">
                            {item.sale.number}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(item.sale.saleDate)}</TableCell>
                        <TableCell>{item.sale.customer?.name ?? 'Walk-in'}</TableCell>
                        <TableCell>{variantLabel(item.variant)}</TableCell>
                        <TableCell className="text-right tabular">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular">{money(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium tabular">{money(item.total)}</TableCell>
                        <TableCell><StatusBadge status={item.sale.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableWrapper>
              )
            ) : null}

            {tab === 'returns' ? (
              data.returns.length === 0 ? (
                <EmptyState title="No returns" description="Nothing has been returned for this product." />
              ) : (
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.returns.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.return.number}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(item.return.returnDate)}</TableCell>
                        <TableCell><StatusBadge status={item.return.type} /></TableCell>
                        <TableCell>{variantLabel(item.variant)}</TableCell>
                        <TableCell className="text-right tabular">{item.quantity}</TableCell>
                        <TableCell><StatusBadge status={item.condition} /></TableCell>
                        <TableCell className="text-muted-foreground">{item.reason ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableWrapper>
              )
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
