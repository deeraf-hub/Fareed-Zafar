import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import type { Location, Supplier, VariantOption } from '@/types';
import { VariantPicker } from '@/features/variant-picker';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/states';
import { money, variantLabel } from '@/lib/utils';

interface Line {
  key: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitCost: number;
  discount: number;
  tax: number;
}

export default function PurchaseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [supplierId, setSupplierId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');
  const [orderDate, setOrderDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = React.useState('');
  const [status, setStatus] = React.useState<'DRAFT' | 'ORDERED' | 'RECEIVED'>('ORDERED');
  const [orderDiscount, setOrderDiscount] = React.useState('0');
  const [paidAmount, setPaidAmount] = React.useState('0');
  const [notes, setNotes] = React.useState('');
  const [lines, setLines] = React.useState<Line[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.get<ListResponse<Supplier>>('/suppliers', { pageSize: 200 }).then((r) => r.data),
  });
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
  });
  const { data: existing, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => api.get<{ data: any }>(`/purchases/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  React.useEffect(() => {
    // Default the destination to the business's default location.
    if (!locationId && locations?.length) {
      setLocationId((locations.find((location) => location.isDefault) ?? locations[0]).id);
    }
  }, [locations, locationId]);

  React.useEffect(() => {
    if (!existing) return;
    setSupplierId(existing.supplier.id);
    setLocationId(existing.location.id);
    setOrderDate(new Date(existing.orderDate).toISOString().slice(0, 10));
    setExpectedDate(existing.expectedDate ? new Date(existing.expectedDate).toISOString().slice(0, 10) : '');
    setStatus(existing.status === 'DRAFT' ? 'DRAFT' : 'ORDERED');
    setPaidAmount(String(existing.paidAmount ?? 0));
    setNotes(existing.notes ?? '');
    setLines(
      existing.items.map((item: any) => ({
        key: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        sku: item.variant.sku,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        unitCost: item.unitCost,
        discount: item.discount,
        tax: item.tax,
      })),
    );
  }, [existing]);

  const addVariant = (variant: VariantOption) => {
    setLines((current) => {
      const found = current.find((line) => line.variantId === variant.id);
      if (found) {
        return current.map((line) =>
          line.variantId === variant.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key: `${variant.id}-${Date.now()}`,
          variantId: variant.id,
          productName: variant.productName,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          quantity: 1,
          unitCost: variant.costPrice,
          discount: 0,
          tax: 0,
        },
      ];
    });
  };

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const subtotal = lines.reduce((sum, line) => sum + line.unitCost * line.quantity, 0);
  const lineDiscounts = lines.reduce((sum, line) => sum + line.discount, 0);
  const taxTotal = lines.reduce((sum, line) => sum + line.tax, 0);
  const total = Math.max(0, subtotal - lineDiscounts - Number(orderDiscount || 0) + taxTotal);

  const save = useMutation({
    mutationFn: (payload: unknown) =>
      isEdit ? api.put<{ data: any }>(`/purchases/${id}`, payload) : api.post<{ data: any }>('/purchases', payload),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        isEdit ? 'Purchase updated' : 'Purchase created',
        status === 'RECEIVED' ? 'Stock has been added to inventory.' : `Purchase ${response.data.number} saved.`,
      );
      navigate(`/purchases/${response.data.id}`);
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not save the purchase.';
      setError(message);
      toast.error('Could not save the purchase', message);
    },
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!supplierId) return setError('Choose the supplier this stock is coming from.');
    if (!locationId) return setError('Choose which location the stock will arrive at.');
    if (lines.length === 0) return setError('Add at least one product to this purchase.');
    if (lines.some((line) => line.quantity < 1)) return setError('Every line needs a quantity of at least 1.');
    if (Number(paidAmount) > total) return setError('The amount paid cannot be more than the purchase total.');

    save.mutate({
      supplierId,
      locationId,
      orderDate,
      expectedDate: expectedDate || undefined,
      status,
      discount: Number(orderDiscount || 0),
      paidAmount: Number(paidAmount || 0),
      notes: notes || undefined,
      items: lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        unitCost: line.unitCost,
        discount: line.discount,
        tax: line.tax,
      })),
    });
  };

  if (isEdit && isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-52" /><Skeleton className="h-72 w-full" /></div>;
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? `Edit ${existing?.number ?? 'purchase'}` : 'New purchase'}
        description="Order stock from a supplier. Receiving it adds the units to inventory."
        breadcrumbs={[{ label: 'Purchases', to: '/purchases' }, { label: isEdit ? 'Edit' : 'New' }]}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link to={isEdit ? `/purchases/${id}` : '/purchases'}>Cancel</Link>
            </Button>
            <Button type="submit" loading={save.isPending}>
              {status === 'RECEIVED' ? 'Save & receive stock' : 'Save purchase'}
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Order details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="supplier" required>Supplier</Label>
                <Select id="supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                  <option value="">Choose a supplier…</option>
                  {suppliers?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location" required>Deliver to</Label>
                <Select id="location" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                  {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orderDate">Order date</Label>
                <Input id="orderDate" type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expectedDate">Expected delivery</Label>
                <Input id="expectedDate" type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
              </div>
              {!isEdit ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="status">Save as</Label>
                  <Select id="status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                    <option value="DRAFT">Draft — not ordered yet</option>
                    <option value="ORDERED">Ordered — waiting for delivery</option>
                    <option value="RECEIVED">Received — add all stock now</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choosing “Received” adds every unit to {locations?.find((l) => l.id === locationId)?.name ?? 'the location'} straight away.
                  </p>
                </div>
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Delivery instructions, invoice reference…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Search or scan to add products. Quantities are per variant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VariantPicker onPick={addVariant} showStock={false} placeholder="Search or scan a product to add…" />

              {lines.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No items yet. Use the search above to add products.
                </p>
              ) : (
                <div className="space-y-2">
                  {lines.map((line) => (
                    <div key={line.key} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{line.productName}</p>
                          <p className="truncate text-xs text-muted-foreground">{line.sku} · {variantLabel(line)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-semibold tabular">
                            {money(line.unitCost * line.quantity - line.discount + line.tax)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                            aria-label={`Remove ${line.productName}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div>
                          <Label htmlFor={`quantity-${line.key}`} className="text-xs text-muted-foreground">Quantity</Label>
                          <Input
                            id={`quantity-${line.key}`}
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(event) => setLine(line.key, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                            className="mt-1"
                            aria-label={`Quantity for ${line.sku}`}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`unitCost-${line.key}`} className="text-xs text-muted-foreground">Unit cost</Label>
                          <Input
                            id={`unitCost-${line.key}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            onChange={(event) => setLine(line.key, { unitCost: Number(event.target.value) || 0 })}
                            className="mt-1"
                            aria-label={`Unit cost for ${line.sku}`}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`discount-${line.key}`} className="text-xs text-muted-foreground">Discount</Label>
                          <Input
                            id={`discount-${line.key}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.discount}
                            onChange={(event) => setLine(line.key, { discount: Number(event.target.value) || 0 })}
                            className="mt-1"
                            aria-label={`Discount for ${line.sku}`}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tax-${line.key}`} className="text-xs text-muted-foreground">Tax</Label>
                          <Input
                            id={`tax-${line.key}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.tax}
                            onChange={(event) => setLine(line.key, { tax: Number(event.target.value) || 0 })}
                            className="mt-1"
                            aria-label={`Tax for ${line.sku}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-20">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Items</dt><dd className="tabular">{lines.length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Units</dt><dd className="tabular">{lines.reduce((sum, line) => sum + line.quantity, 0)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular">{money(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Line discounts</dt><dd className="tabular">−{money(lineDiscounts)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd className="tabular">{money(taxTotal)}</dd></div>
              </dl>

              <div className="space-y-1.5 border-t pt-3">
                <Label htmlFor="orderDiscount">Order discount</Label>
                <Input id="orderDiscount" type="number" min="0" step="0.01" value={orderDiscount} onChange={(event) => setOrderDiscount(event.target.value)} />
              </div>

              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>Total</span>
                <span className="tabular">{money(total)}</span>
              </div>

              <div className="space-y-1.5 border-t pt-3">
                <Label htmlFor="paidAmount">Amount paid</Label>
                <Input id="paidAmount" type="number" min="0" step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
                <p className="text-xs text-muted-foreground">Outstanding {money(Math.max(0, total - Number(paidAmount || 0)))}</p>
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{error}</p>
              ) : null}

              <Button type="submit" className="w-full" loading={save.isPending}>
                {status === 'RECEIVED' ? 'Save & receive stock' : 'Save purchase'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
