import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Banknote, Pencil, PackageCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { MovementBadge, QuantityDelta, StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, money, variantLabel } from '@/lib/utils';

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [receipts, setReceipts] = React.useState<Record<string, number>>({});
  const [payment, setPayment] = React.useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => api.get<{ data: any }>(`/purchases/${id}`).then((r) => r.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['purchase', id] });
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const receive = useMutation({
    mutationFn: (payload: unknown) => api.post<{ message: string }>(`/purchases/${id}/receive`, payload),
    onSuccess: (response) => {
      invalidate();
      setReceiveOpen(false);
      toast.success('Stock received', response.message);
    },
    onError: (err) => toast.error('Could not receive the stock', (err as Error).message),
  });

  const recordPayment = useMutation({
    mutationFn: () => api.post(`/purchases/${id}/payment`, { paidAmount: Number(payment || 0) }),
    onSuccess: () => {
      invalidate();
      setPayOpen(false);
      toast.success('Payment recorded');
    },
    onError: (err) => toast.error('Could not record the payment', (err as Error).message),
  });

  const cancel = useMutation({
    mutationFn: () => api.post<{ message: string }>(`/purchases/${id}/cancel`),
    onSuccess: (response) => {
      invalidate();
      toast.toast({ title: 'Purchase cancelled', description: response.message, variant: 'warning' });
    },
    onError: (err) => toast.error('Could not cancel the purchase', (err as Error).message),
  });

  const openReceive = () => {
    setReceipts(
      Object.fromEntries(
        (data?.items ?? []).map((item: any) => [item.id, Math.max(0, item.quantity - item.receivedQty)]),
      ),
    );
    setReceiveOpen(true);
  };

  const onCancel = async () => {
    const confirmed = await confirm({
      title: `Cancel ${data?.number}?`,
      description:
        'Anything already received is taken back out of stock. The purchase stays on record so the history remains auditable.',
      confirmLabel: 'Cancel purchase',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (confirmed) cancel.mutate();
  };

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72 w-full" /></div>;
  }

  const outstandingUnits = data.items.reduce(
    (sum: number, item: any) => sum + Math.max(0, item.quantity - item.receivedQty),
    0,
  );
  const canReceive = can('purchase:receive') && data.status !== 'CANCELLED' && outstandingUnits > 0;
  const canEdit = can('purchase:create') && (data.status === 'DRAFT' || data.status === 'ORDERED');

  return (
    <>
      <PageHeader
        title={data.number}
        description={`${data.supplier.name} · ${formatDate(data.orderDate)}`}
        breadcrumbs={[{ label: 'Purchases', to: '/purchases' }, { label: data.number }]}
        actions={
          <>
            {canEdit ? (
              <Button variant="outline" asChild>
                <Link to={`/purchases/${id}/edit`}><Pencil className="h-4 w-4" />Edit</Link>
              </Button>
            ) : null}
            {can('purchase:create') && data.status !== 'CANCELLED' ? (
              <Button variant="outline" onClick={() => { setPayment(String(data.total)); setPayOpen(true); }}>
                <Banknote className="h-4 w-4" />
                <span className="hidden sm:inline">Record payment</span>
              </Button>
            ) : null}
            {canReceive ? (
              <Button onClick={openReceive}>
                <PackageCheck className="h-4 w-4" />
                Receive stock
              </Button>
            ) : null}
            {can('purchase:cancel') && data.status !== 'CANCELLED' ? (
              <Button variant="destructive" onClick={onCancel} loading={cancel.isPending}>
                <Ban className="h-4 w-4" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                {outstandingUnits > 0
                  ? `${outstandingUnits} unit${outstandingUnits === 1 ? '' : 's'} still to arrive`
                  : 'Everything on this order has been received'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <TableWrapper>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
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
                      <TableCell className="text-right tabular">
                        <span className={item.receivedQty >= item.quantity ? 'text-emerald-600' : 'text-amber-600'}>
                          {item.receivedQty}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular">{money(item.unitCost)}</TableCell>
                      <TableCell className="text-right font-medium tabular">{money(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableWrapper>
            </CardContent>
          </Card>

          {data.movements?.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Stock movements from this purchase</CardTitle></CardHeader>
              <CardContent className="p-0">
                <TableWrapper>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Before → after</TableHead>
                      <TableHead>User</TableHead>
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
                        <TableCell className="text-muted-foreground">{movement.user?.name ?? 'System'}</TableCell>
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
            <CardHeader><CardTitle>Order</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={data.status} /></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Supplier</dt><dd className="text-right"><Link to={`/suppliers/${data.supplier.id}`} className="hover:underline">{data.supplier.name}</Link></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Deliver to</dt><dd>{data.location.name}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Order date</dt><dd>{formatDate(data.orderDate)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Expected</dt><dd>{formatDate(data.expectedDate)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Received</dt><dd>{formatDate(data.receivedDate)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Created by</dt><dd>{data.createdBy?.name ?? '—'}</dd></div>
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
                <div className="flex justify-between"><dt className="text-muted-foreground">Paid</dt><dd className="tabular">{money(data.paidAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Outstanding</dt><dd className="tabular font-medium">{money(data.total - data.paidAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Payment</dt><dd><StatusBadge status={data.paymentStatus} /></dd></div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Receive stock for {data.number}</DialogTitle>
            <DialogDescription>
              Enter what actually arrived. Stock is added to {data.location.name} and a movement is recorded for each line.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {data.items.map((item: any) => {
              const outstanding = Math.max(0, item.quantity - item.receivedQty);
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.variant.product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.variant.sku} · {variantLabel(item.variant)} · {outstanding} outstanding
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={outstanding}
                    disabled={outstanding === 0}
                    value={receipts[item.id] ?? 0}
                    onChange={(event) =>
                      setReceipts((current) => ({
                        ...current,
                        [item.id]: Math.min(outstanding, Math.max(0, Number(event.target.value) || 0)),
                      }))
                    }
                    className="w-24 shrink-0"
                    aria-label={`Quantity received for ${item.variant.sku}`}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={() => receive.mutate({ receiveAll: true })}
              loading={receive.isPending}
            >
              Receive everything
            </Button>
            <Button
              onClick={() =>
                receive.mutate({
                  items: Object.entries(receipts)
                    .filter(([, quantity]) => quantity > 0)
                    .map(([itemId, quantity]) => ({ itemId, quantity })),
                })
              }
              loading={receive.isPending}
            >
              Receive these quantities
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Total for this purchase is {money(data.total)}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="payAmount">Amount paid to date</Label>
            <Input
              id="payAmount"
              type="number"
              min="0"
              max={data.total}
              step="0.01"
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={() => recordPayment.mutate()} loading={recordPayment.isPending}>Save payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
