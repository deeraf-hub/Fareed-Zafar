import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Minus, Plus, Trash2, UserPlus } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import type { Customer, Location, VariantOption } from '@/types';
import { VariantPicker } from '@/features/variant-picker';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { money, variantLabel } from '@/lib/utils';

interface Line {
  key: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  available: number;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'EASYPAISA', label: 'Easypaisa' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'OTHER', label: 'Other' },
];

export default function SaleFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const [customerId, setCustomerId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');
  const [saleDate, setSaleDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = React.useState('CASH');
  const [orderDiscount, setOrderDiscount] = React.useState('0');
  const [paidAmount, setPaidAmount] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [lines, setLines] = React.useState<Line[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState({ name: '', phone: '' });

  const { data: customers } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get<ListResponse<Customer>>('/customers', { pageSize: 200 }).then((r) => r.data),
  });
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
  });

  React.useEffect(() => {
    if (!locationId && locations?.length) {
      setLocationId((locations.find((location) => location.isDefault) ?? locations[0]).id);
    }
  }, [locations, locationId]);

  const addVariant = (variant: VariantOption) => {
    setLines((current) => {
      const found = current.find((line) => line.variantId === variant.id);
      if (found) {
        // Guard at the point of entry as well as on the server, so the
        // cashier sees the problem before they try to save.
        if (found.quantity + 1 > variant.available) {
          toast.error('Not enough stock', `Only ${variant.available} of ${variant.sku} available here.`);
          return current;
        }
        return current.map((line) =>
          line.variantId === variant.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      if (variant.available < 1) {
        toast.error('Out of stock', `${variant.sku} has no stock at this location.`);
        return current;
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
          unitPrice: variant.sellingPrice,
          discount: 0,
          tax: 0,
          available: variant.available,
        },
      ];
    });
  };

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const lineDiscounts = lines.reduce((sum, line) => sum + line.discount, 0);
  const taxTotal = lines.reduce((sum, line) => sum + line.tax, 0);
  const total = Math.max(0, subtotal - lineDiscounts - Number(orderDiscount || 0) + taxTotal);
  const overSold = lines.filter((line) => line.quantity > line.available);

  React.useEffect(() => {
    // Cash sales are usually paid in full, so prefill the received amount.
    setPaidAmount(total > 0 ? String(total) : '');
  }, [total]);

  const createCustomer = useMutation({
    mutationFn: () => api.post<{ data: Customer }>('/customers', newCustomer),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomerId(response.data.id);
      setNewCustomerOpen(false);
      setNewCustomer({ name: '', phone: '' });
      toast.success('Customer added', `${response.data.name} is now on this sale.`);
    },
    onError: (err) => toast.error('Could not add the customer', (err as Error).message),
  });

  const save = useMutation({
    mutationFn: (payload: unknown) => api.post<{ data: any }>('/sales', payload),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`Sale ${response.data.number} completed`, 'Stock has been updated.');
      navigate(`/sales/${response.data.id}`);
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not record the sale.';
      setError(message);
      toast.error('Could not record the sale', message);
    },
  });

  const submit = (status: 'COMPLETED' | 'DRAFT') => {
    setError(null);
    if (!locationId) return setError('Choose which location this sale is from.');
    if (lines.length === 0) return setError('Add at least one product to this sale.');
    if (status === 'COMPLETED' && overSold.length > 0) {
      return setError(`Not enough stock for ${overSold.map((line) => line.sku).join(', ')}.`);
    }
    if (Number(paidAmount || 0) > total) return setError('The amount received cannot be more than the sale total.');

    save.mutate({
      customerId: customerId || null,
      locationId,
      saleDate,
      status,
      paymentMethod,
      discount: Number(orderDiscount || 0),
      paidAmount: Number(paidAmount || 0),
      notes: notes || undefined,
      items: lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        tax: line.tax,
      })),
    });
  };

  return (
    <>
      <PageHeader
        title="New sale"
        description="Scan or search to add items. Stock is deducted the moment the sale is completed."
        breadcrumbs={[{ label: 'Sales', to: '/sales' }, { label: 'New sale' }]}
        actions={
          <>
            <Button variant="outline" asChild><Link to="/sales">Cancel</Link></Button>
            <Button variant="secondary" onClick={() => submit('DRAFT')} loading={save.isPending}>
              Save as draft
            </Button>
            <Button onClick={() => submit('COMPLETED')} loading={save.isPending}>
              Complete sale
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Scanning a barcode adds the item straight away.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VariantPicker
                locationId={locationId}
                onPick={addVariant}
                autoFocus
                placeholder="Scan a barcode, or search by product or SKU…"
              />

              {lines.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No items yet. Scan a barcode or search above to start the sale.
                </p>
              ) : (
                <div className="space-y-2">
                  {lines.map((line) => {
                    const over = line.quantity > line.available;
                    return (
                      <div key={line.key} className={`rounded-lg border p-3 ${over ? 'border-destructive bg-red-50/50' : ''}`}>
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{line.productName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {line.sku} · {variantLabel(line)} · {line.available} available
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-sm font-semibold tabular">
                              {money(line.unitPrice * line.quantity - line.discount + line.tax)}
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

                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Quantity</Label>
                            <div className="mt-1 flex items-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="rounded-r-none"
                                onClick={() => setLine(line.key, { quantity: Math.max(1, line.quantity - 1) })}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(event) => setLine(line.key, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                                className="w-16 rounded-none border-x-0 text-center"
                                aria-label="Quantity"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="rounded-l-none"
                                onClick={() => setLine(line.key, { quantity: line.quantity + 1 })}
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="w-28">
                            <Label className="text-xs text-muted-foreground">Unit price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(event) => setLine(line.key, { unitPrice: Number(event.target.value) || 0 })}
                              className="mt-1"
                              aria-label={`Unit price for ${line.sku}`}
                            />
                          </div>
                          <div className="w-28">
                            <Label className="text-xs text-muted-foreground">Discount</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.discount}
                              onChange={(event) => setLine(line.key, { discount: Number(event.target.value) || 0 })}
                              className="mt-1"
                              aria-label={`Discount for ${line.sku}`}
                            />
                          </div>
                          <div className="w-24">
                            <Label className="text-xs text-muted-foreground">Tax</Label>
                            <Input
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

                        {over ? (
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Only {line.available} in stock at this location.
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Sale details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="location" required>Location</Label>
                <Select id="location" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                  {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer">Customer</Label>
                <div className="flex gap-2">
                  <Select id="customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                    <option value="">Walk-in customer</option>
                    {customers?.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}{customer.phone ? ` — ${customer.phone}` : ''}
                      </option>
                    ))}
                  </Select>
                  {can('customer:manage') ? (
                    <Button type="button" variant="outline" size="icon" onClick={() => setNewCustomerOpen(true)} aria-label="Add customer">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="saleDate">Date</Label>
                <Input id="saleDate" type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod">Payment method</Label>
                <Select id="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:sticky lg:top-20">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Items</dt><dd className="tabular">{lines.reduce((sum, line) => sum + line.quantity, 0)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular">{money(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Line discounts</dt><dd className="tabular">−{money(lineDiscounts)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd className="tabular">{money(taxTotal)}</dd></div>
              </dl>
              <div className="space-y-1.5 border-t pt-3">
                <Label htmlFor="orderDiscount">Order discount</Label>
                <Input id="orderDiscount" type="number" min="0" step="0.01" value={orderDiscount} onChange={(event) => setOrderDiscount(event.target.value)} />
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
                <span>Total</span>
                <span className="tabular">{money(total)}</span>
              </div>
              <div className="space-y-1.5 border-t pt-3">
                <Label htmlFor="paidAmount">Amount received</Label>
                <Input id="paidAmount" type="number" min="0" step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
                {Number(paidAmount || 0) < total ? (
                  <p className="text-xs text-amber-600">Balance due {money(total - Number(paidAmount || 0))}</p>
                ) : (
                  <p className="text-xs text-emerald-600">Paid in full</p>
                )}
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{error}</p>
              ) : null}

              <Button className="w-full" onClick={() => submit('COMPLETED')} loading={save.isPending}>
                Complete sale
              </Button>
              <Button variant="outline" className="w-full" onClick={() => submit('DRAFT')} loading={save.isPending}>
                Save as draft
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Add a customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="customerName" required>Name</Label>
              <Input
                id="customerName"
                value={newCustomer.name}
                onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={newCustomer.phone}
                onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+92 300 1234567"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createCustomer.mutate()}
              loading={createCustomer.isPending}
              disabled={!newCustomer.name.trim()}
            >
              Add customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
