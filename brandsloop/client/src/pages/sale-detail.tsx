import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { MovementBadge, QuantityDelta, StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, humanize, money, variantLabel } from '@/lib/utils';

export default function SaleDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => api.get<{ data: any }>(`/sales/${id}`).then((r) => r.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sale', id] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const complete = useMutation({
    mutationFn: () => api.post(`/sales/${id}/complete`),
    onSuccess: () => {
      invalidate();
      toast.success('Sale completed', 'Stock has been deducted.');
    },
    onError: (err) => toast.error('Could not complete the sale', (err as Error).message),
  });

  const cancel = useMutation({
    mutationFn: () => api.post<{ message: string }>(`/sales/${id}/cancel`),
    onSuccess: (response) => {
      invalidate();
      toast.toast({ title: 'Sale cancelled', description: response.message, variant: 'warning' });
    },
    onError: (err) => toast.error('Could not cancel the sale', (err as Error).message),
  });

  const onCancel = async () => {
    const confirmed = await confirm({
      title: `Cancel ${data?.number}?`,
      description: 'The items go back into stock and the sale is marked cancelled. The record is kept for the audit trail.',
      confirmLabel: 'Cancel sale',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (confirmed) cancel.mutate();
  };

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72 w-full" /></div>;
  }

  const showProfit = typeof data.profit === 'number';

  return (
    <>
      <PageHeader
        title={data.number}
        description={`${data.customer?.name ?? 'Walk-in customer'} · ${formatDate(data.saleDate, true)}`}
        breadcrumbs={[{ label: 'Sales', to: '/sales' }, { label: data.number }]}
        actions={
          <>
            {can('return:create') && data.status === 'COMPLETED' ? (
              <Button variant="outline" asChild>
                <Link to={`/returns?saleId=${data.id}`}>
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Record return</span>
                </Link>
              </Button>
            ) : null}
            {can('sale:create') && data.status === 'DRAFT' ? (
              <Button onClick={() => complete.mutate()} loading={complete.isPending}>
                <CheckCircle2 className="h-4 w-4" />
                Complete sale
              </Button>
            ) : null}
            {can('sale:cancel') && data.status !== 'CANCELLED' ? (
              <Button variant="destructive" onClick={onCancel} loading={cancel.isPending}>
                <Ban className="h-4 w-4" />
                <span className="hidden sm:inline">Cancel sale</span>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Items sold</CardTitle></CardHeader>
            <CardContent className="p-0">
              <TableWrapper>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {showProfit ? <TableHead className="text-right">Profit</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link to={`/products/${item.variant.product.id}`} className="font-medium hover:underline">
                          {item.variant.product.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.variant.sku}</TableCell>
                      <TableCell>{variantLabel(item.variant)}</TableCell>
                      <TableCell className="text-right tabular">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular">{money(item.unitPrice)}</TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">
                        {item.discount > 0 ? `−${money(item.discount)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular">{money(item.total)}</TableCell>
                      {showProfit ? (
                        <TableCell className="text-right tabular text-emerald-600">{money(item.profit)}</TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </TableWrapper>
            </CardContent>
          </Card>

          {data.movements?.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Stock movements</CardTitle></CardHeader>
              <CardContent className="p-0">
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Before → after</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.movements.map((movement: any) => (
                      <TableRow key={movement.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(movement.createdAt, true)}</TableCell>
                        <TableCell>{movement.variant.product.name}</TableCell>
                        <TableCell><MovementBadge type={movement.type} /></TableCell>
                        <TableCell className="text-right"><QuantityDelta value={movement.quantity} /></TableCell>
                        <TableCell className="text-right tabular text-muted-foreground">{movement.previousQty} → {movement.newQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableWrapper>
              </CardContent>
            </Card>
          ) : null}

          {data.returns?.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Returns against this sale</CardTitle></CardHeader>
              <CardContent className="p-0">
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Refund</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.returns.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.number}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(item.returnDate)}</TableCell>
                        <TableCell>
                          {item.items.map((line: any) => `${line.variant.sku} ×${line.quantity}`).join(', ')}
                        </TableCell>
                        <TableCell className="text-right tabular">{money(item.refundAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableWrapper>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Sale</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={data.status} /></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Customer</dt><dd className="text-right">{data.customer?.name ?? 'Walk-in'}</dd></div>
                {data.customer?.phone ? (
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Phone</dt><dd>{data.customer.phone}</dd></div>
                ) : null}
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Location</dt><dd>{data.location.name}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Date</dt><dd>{formatDate(data.saleDate, true)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Sold by</dt><dd>{data.createdBy?.name ?? '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Payment</dt><dd>{humanize(data.paymentMethod)}</dd></div>
              </dl>
              {data.notes ? <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{data.notes}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular">{money(data.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="tabular">−{money(data.discount)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd className="tabular">{money(data.tax)}</dd></div>
                <div className="flex justify-between border-t pt-2.5 text-base font-semibold"><dt>Total</dt><dd className="tabular">{money(data.total)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Received</dt><dd className="tabular">{money(data.paidAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Balance</dt><dd className="tabular font-medium">{money(data.total - data.paidAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Payment status</dt><dd><StatusBadge status={data.paymentStatus} /></dd></div>
                {showProfit ? (
                  <div className="flex justify-between border-t pt-2.5">
                    <dt className="text-muted-foreground">Gross profit</dt>
                    <dd className="font-semibold tabular text-emerald-600">{money(data.profit)}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
