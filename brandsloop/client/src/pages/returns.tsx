import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import type { Customer, Location, Supplier, VariantOption } from '@/types';
import { VariantPicker } from '@/features/variant-picker';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useListQuery } from '@/hooks/use-list-query';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, money, variantLabel } from '@/lib/utils';

interface Line {
  key: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  quantity: number;
  condition: 'RESELLABLE' | 'DAMAGED';
  unitPrice: number;
  reason: string;
}

export default function ReturnsPage() {
  const { state, update, reset, activeFilterCount } = useListQuery();
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const saleIdParam = params.get('saleId');
  const [open, setOpen] = React.useState(Boolean(saleIdParam));
  const [type, setType] = React.useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [saleId, setSaleId] = React.useState(saleIdParam ?? '');
  const [customerId, setCustomerId] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [lines, setLines] = React.useState<Line[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, sortDir: state.sortDir, ...state.filters };

  const { data, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: ['returns', query],
    queryFn: () => api.get<ListResponse<any>>('/returns', query),
  });
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
  });
  const { data: customers } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get<ListResponse<Customer>>('/customers', { pageSize: 200 }).then((r) => r.data),
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.get<ListResponse<Supplier>>('/suppliers', { pageSize: 200 }).then((r) => r.data),
    enabled: can('supplier:view'),
  });

  // When arriving from a sale, prefill the whole form from that sale.
  const { data: sourceSale } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => api.get<{ data: any }>(`/sales/${saleId}`).then((r) => r.data),
    enabled: Boolean(saleId),
  });

  React.useEffect(() => {
    if (!locationId && locations?.length) {
      setLocationId((locations.find((location) => location.isDefault) ?? locations[0]).id);
    }
  }, [locations, locationId]);

  React.useEffect(() => {
    if (!sourceSale) return;
    setType('CUSTOMER');
    setCustomerId(sourceSale.customer?.id ?? '');
    setLocationId(sourceSale.location.id);
    setLines(
      sourceSale.items.map((item: any) => ({
        key: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        sku: item.variant.sku,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        condition: 'RESELLABLE' as const,
        unitPrice: item.unitPrice,
        reason: '',
      })),
    );
  }, [sourceSale]);

  const addVariant = (variant: VariantOption) => {
    if (lines.some((line) => line.variantId === variant.id)) return;
    setLines((current) => [
      ...current,
      {
        key: `${variant.id}-${Date.now()}`,
        variantId: variant.id,
        productName: variant.productName,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        quantity: 1,
        condition: 'RESELLABLE',
        unitPrice: type === 'SUPPLIER' ? variant.costPrice : variant.sellingPrice,
        reason: '',
      },
    ]);
  };

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const closeDialog = () => {
    setOpen(false);
    setLines([]);
    setSaleId('');
    setReason('');
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('saleId');
      return next;
    }, { replace: true });
  };

  const save = useMutation({
    mutationFn: (payload: unknown) => api.post('/returns', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Return recorded', 'Resellable items are back in stock; damaged items are held separately.');
      closeDialog();
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not record the return.';
      setError(message);
      toast.error('Could not record the return', message);
    },
  });

  const submit = () => {
    setError(null);
    if (!locationId) return setError('Choose a location.');
    if (type === 'SUPPLIER' && !supplierId) return setError('Choose the supplier the goods go back to.');
    if (lines.length === 0) return setError('Add at least one item to this return.');
    save.mutate({
      type,
      saleId: type === 'CUSTOMER' && saleId ? saleId : undefined,
      customerId: type === 'CUSTOMER' && customerId ? customerId : undefined,
      supplierId: type === 'SUPPLIER' ? supplierId : undefined,
      locationId,
      reason: reason || undefined,
      items: lines.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        condition: type === 'SUPPLIER' ? 'RESELLABLE' : line.condition,
        unitPrice: line.unitPrice,
        reason: line.reason || undefined,
      })),
    });
  };

  const returns = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Returns"
        description="Goods coming back from customers, and stock going back to suppliers."
        breadcrumbs={[{ label: 'Returns' }]}
        actions={can('return:create') ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New return</Button> : null}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={state.search}
            onChange={(value) => update({ search: value })}
            placeholder="Search return number, sale or customer…"
            className="lg:max-w-sm lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
            <Select value={state.filters.type ?? 'all'} onChange={(event) => update({ type: event.target.value })} aria-label="Return type" className="lg:w-[170px]">
              <option value="all">All returns</option>
              <option value="CUSTOMER">Customer returns</option>
              <option value="SUPPLIER">Supplier returns</option>
            </Select>
            <Select value={state.filters.condition ?? 'all'} onChange={(event) => update({ condition: event.target.value })} aria-label="Condition" className="lg:w-[160px]">
              <option value="all">Any condition</option>
              <option value="RESELLABLE">Resellable</option>
              <option value="DAMAGED">Damaged</option>
            </Select>
          </div>
          {activeFilterCount > 0 || state.search ? <Button variant="ghost" size="sm" onClick={reset}>Clear</Button> : null}
        </div>

        {isError ? (
          <ErrorState message={(listError as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : returns.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="No returns recorded"
            description="Resellable returns go back into stock; damaged ones are recorded but held out of it."
            action={can('return:create') ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New return</Button> : null}
          />
        ) : (
          <>
            <TableWrapper>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Against</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Refund</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs font-medium">{record.number}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(record.returnDate)}</TableCell>
                    <TableCell><StatusBadge status={record.type} /></TableCell>
                    <TableCell>
                      {record.type === 'CUSTOMER'
                        ? (record.customer?.name ?? 'Walk-in')
                        : (record.supplier?.name ?? '—')}
                      {record.sale ? (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">({record.sale.number})</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <ul className="space-y-0.5">
                        {record.items.map((item: any) => (
                          <li key={item.id} className="flex items-center gap-1.5 text-xs">
                            <span>{item.variant.product.name} · {item.variant.sku} ×{item.quantity}</span>
                            <StatusBadge status={item.condition} />
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-muted-foreground">{record.reason ?? '—'}</TableCell>
                    <TableCell className="text-right tabular">{money(record.refundAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableWrapper>
            <Pagination meta={data?.meta} onPageChange={(page) => update({ page }, false)} onPageSizeChange={(pageSize) => update({ pageSize })} />
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>New return</DialogTitle>
            <DialogDescription>
              Resellable customer returns go straight back into stock. Damaged ones are recorded as damaged and stay out of it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="returnType" required>Return type</Label>
                <Select
                  id="returnType"
                  value={type}
                  onChange={(event) => { setType(event.target.value as typeof type); setLines([]); }}
                >
                  <option value="CUSTOMER">Customer return (stock comes in)</option>
                  <option value="SUPPLIER">Supplier return (stock goes out)</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="returnLocation" required>Location</Label>
                <Select id="returnLocation" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                  {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </Select>
              </div>
              {type === 'CUSTOMER' ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="returnCustomer">Customer</Label>
                    <Select id="returnCustomer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                      <option value="">Walk-in customer</option>
                      {customers?.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="returnSale">Original sale</Label>
                    <Input
                      id="returnSale"
                      value={sourceSale?.number ?? saleId}
                      onChange={(event) => setSaleId(event.target.value)}
                      placeholder="Optional — open a sale and choose “Record return”"
                      readOnly={Boolean(sourceSale)}
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="returnSupplier" required>Supplier</Label>
                  <Select id="returnSupplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                    <option value="">Choose a supplier…</option>
                    {suppliers?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="returnReason">Reason</Label>
              <Textarea
                id="returnReason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                placeholder="Wrong size, stitching defect, faulty batch…"
              />
            </div>

            <VariantPicker locationId={locationId} onPick={addVariant} placeholder="Search or scan the item being returned…" />

            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No items yet.
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
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                        aria-label={`Remove ${line.productName}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(event) => setLine(line.key, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                          className="mt-1"
                          aria-label={`Return quantity for ${line.sku}`}
                        />
                      </div>
                      {type === 'CUSTOMER' ? (
                        <div>
                          <Label className="text-xs text-muted-foreground">Condition</Label>
                          <Select
                            value={line.condition}
                            onChange={(event) => setLine(line.key, { condition: event.target.value as Line['condition'] })}
                            className="mt-1"
                            aria-label={`Condition for ${line.sku}`}
                          >
                            <option value="RESELLABLE">Resellable — back into stock</option>
                            <option value="DAMAGED">Damaged — not sellable</option>
                          </Select>
                        </div>
                      ) : null}
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {type === 'CUSTOMER' ? 'Refund per unit' : 'Unit cost'}
                        </Label>
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
                    </div>
                  </div>
                ))}
                <p className="text-right text-sm">
                  <span className="text-muted-foreground">Total refund </span>
                  <span className="font-semibold tabular">
                    {money(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0))}
                  </span>
                </p>
              </div>
            )}

            {error ? <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={submit} loading={save.isPending}>Record return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
