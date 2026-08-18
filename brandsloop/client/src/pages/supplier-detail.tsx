import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Banknote, Mail, MapPin, Package, Phone, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { formatDate, money, number } from '@/lib/utils';

export default function SupplierDetailPage() {
  const { id } = useParams();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => api.get<{ data: any }>(`/suppliers/${id}`).then((r) => r.data),
  });

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72 w-full" /></div>;
  }

  return (
    <>
      <PageHeader
        title={data.name}
        description={data.contactPerson ? `Contact: ${data.contactPerson}` : undefined}
        breadcrumbs={[{ label: 'Suppliers', to: '/suppliers' }, { label: data.name }]}
        actions={<StatusBadge status={data.status} />}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total purchased" value={money(data.stats.totalPurchases, { compact: true })} icon={Banknote} tone="success" />
        <StatCard label="Outstanding" value={money(data.stats.outstandingBalance, { compact: true })} icon={Banknote} tone={data.stats.outstandingBalance > 0 ? 'warning' : 'default'} />
        <StatCard label="Purchase orders" value={number(data.stats.purchaseCount)} icon={ShoppingCart} tone="info" />
        <StatCard label="Products supplied" value={number(data.stats.productCount)} icon={Package} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader><CardTitle>Contact details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.phone ? (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-muted-foreground" />{data.phone}</p>
            ) : null}
            {data.email ? (
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{data.email}</span></p>
            ) : null}
            {data.address || data.city ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{[data.address, data.city].filter(Boolean).join(', ')}</span>
              </p>
            ) : null}
            {data.taxNumber ? (
              <p className="text-muted-foreground">Tax number: <span className="text-foreground">{data.taxNumber}</span></p>
            ) : null}
            {data.notes ? <p className="border-t pt-3 text-muted-foreground">{data.notes}</p> : null}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader><CardTitle>Purchase history</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.purchases.length === 0 ? (
                <EmptyState title="No purchases yet" description="Nothing has been ordered from this supplier." />
              ) : (
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Purchase #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.purchases.map((purchase: any) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          <Link to={`/purchases/${purchase.id}`} className="font-mono text-xs font-medium hover:underline">
                            {purchase.number}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(purchase.orderDate)}</TableCell>
                        <TableCell className="text-muted-foreground">{purchase.location.name}</TableCell>
                        <TableCell className="text-right tabular">{purchase._count.items}</TableCell>
                        <TableCell className="text-right font-medium tabular">{money(purchase.total)}</TableCell>
                        <TableCell className="text-right tabular">{money(purchase.paidAmount)}</TableCell>
                        <TableCell><StatusBadge status={purchase.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableWrapper>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Products supplied</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.products.length === 0 ? (
                <EmptyState title="No products linked" description="Assign this supplier on a product to see it here." />
              ) : (
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Selling price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.products.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Link to={`/products/${product.id}`} className="font-medium hover:underline">{product.name}</Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                        <TableCell className="text-right tabular">{number(product.stock)}</TableCell>
                        <TableCell className="text-right tabular">{money(product.sellingPrice)}</TableCell>
                        <TableCell><StatusBadge status={product.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableWrapper>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
