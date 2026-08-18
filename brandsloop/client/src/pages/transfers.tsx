import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import type { Location, VariantOption } from '@/types';
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
import { formatDate, variantLabel } from '@/lib/utils';

interface Line {
  key: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  quantity: number;
  available: number;
}

export default function TransfersPage() {
  const { state, update, reset, activeFilterCount } = useListQuery();
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = React.useState(false);
  const [fromLocationId, setFromLocationId] = React.useState('');
  const [toLocationId, setToLocationId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [lines, setLines] = React.useState<Line[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, sortDir: state.sortDir, ...state.filters };

  const { data, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: ['transfers', query],
    queryFn: () => api.get<ListResponse<any>>('/stock-transfers', query),
  });
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
  });

  React.useEffect(() => {
    if (locations && locations.length >= 2) {
      if (!fromLocationId) setFromLocationId(locations.find((l) => l.type === 'WAREHOUSE')?.id ?? locations[0].id);
      if (!toLocationId) setToLocationId(locations.find((l) => l.isDefault)?.id ?? locations[1].id);
    }
  }, [locations, fromLocationId, toLocationId]);

  React.useEffect(() => {
    if (params.get('new') === '1') {
      setOpen(true);
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('new');
        return next;
      }, { replace: true });
    }
  }, [params, setParams]);

  const addVariant = (variant: VariantOption) => {
    if (lines.some((line) => line.variantId === variant.id)) {
      toast.error('Already added', 'That item is already on this transfer.');
      return;
    }
    if (variant.available < 1) {
      toast.error('Nothing to move', `${variant.sku} has no stock at the source location.`);
      return;
    }
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
        available: variant.available,
      },
    ]);
  };

  const save = useMutation({
    mutationFn: (payload: unknown) => api.post('/stock-transfers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Stock transferred', 'The stock has moved and both movements were recorded.');
      setOpen(false);
      setLines([]);
      setNotes('');
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not complete the transfer.';
      setError(message);
      toast.error('Could not complete the transfer', message);
    },
  });

  const submit = (complete: boolean) => {
    setError(null);
    if (!fromLocationId || !toLocationId) return setError('Choose both a source and a destination location.');
    if (fromLocationId === toLocationId) return setError('The source and destination must be different.');
    if (lines.length === 0) return setError('Add at least one product to transfer.');
    const over = lines.filter((line) => line.quantity > line.available);
    if (complete && over.length > 0) {
      return setError(`Not enough stock at the source for ${over.map((line) => line.sku).join(', ')}.`);
    }
    save.mutate({
      fromLocationId,
      toLocationId,
      complete,
      notes: notes || undefined,
      items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    });
  };

  const transfers = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Stock transfers"
        description="Move stock between the warehouse, store and outlets."
        breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: 'Transfers' }]}
        actions={
          can('inventory:transfer') ? (
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New transfer</Button>
          ) : null
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={state.search}
            onChange={(value) => update({ search: value })}
            placeholder="Search transfer number…"
            className="lg:max-w-sm lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
            <Select value={state.filters.status ?? 'all'} onChange={(event) => update({ status: event.target.value })} aria-label="Status" className="lg:w-[150px]">
              <option value="all">Any status</option>
              <option value="DRAFT">Draft</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
            <Select value={state.filters.locationId ?? 'all'} onChange={(event) => update({ locationId: event.target.value })} aria-label="Location" className="lg:w-[160px]">
              <option value="all">All locations</option>
              {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
          </div>
          {activeFilterCount > 0 || state.search ? <Button variant="ghost" size="sm" onClick={reset}>Clear</Button> : null}
        </div>

        {isError ? (
          <ErrorState message={(listError as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transfers yet"
            description="Transfers move stock between locations and record a movement at each end."
            action={can('inventory:transfer') ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New transfer</Button> : null}
          />
        ) : (
          <>
            <TableWrapper>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer: any) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono text-xs font-medium">{transfer.number}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(transfer.transferDate)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        {transfer.fromLocation.name}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        {transfer.toLocation.name}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[18rem]">
                      <span className="text-xs text-muted-foreground">
                        {transfer.items.slice(0, 2).map((item: any) => `${item.variant.sku} ×${item.quantity}`).join(', ')}
                        {transfer.items.length > 2 ? ` +${transfer.items.length - 2} more` : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {transfer.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                    </TableCell>
                    <TableCell><StatusBadge status={transfer.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{transfer.createdBy?.name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableWrapper>
            <Pagination meta={data?.meta} onPageChange={(page) => update({ page }, false)} onPageSizeChange={(pageSize) => update({ pageSize })} />
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>New stock transfer</DialogTitle>
            <DialogDescription>
              Stock leaves the source and arrives at the destination — two movements, one per end.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fromLocation" required>From</Label>
                <Select
                  id="fromLocation"
                  value={fromLocationId}
                  onChange={(event) => { setFromLocationId(event.target.value); setLines([]); }}
                >
                  {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="toLocation" required>To</Label>
                <Select id="toLocation" value={toLocationId} onChange={(event) => setToLocationId(event.target.value)}>
                  {locations?.map((location) => (
                    <option key={location.id} value={location.id} disabled={location.id === fromLocationId}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <VariantPicker locationId={fromLocationId} onPick={addVariant} placeholder="Search or scan an item to move…" />

            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No items yet. Search above to add what you are moving.
              </p>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.key} className="flex items-end gap-3 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.productName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {line.sku} · {variantLabel(line)} · {line.available} at source
                      </p>
                    </div>
                    <div className="w-24 shrink-0">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        max={line.available}
                        value={line.quantity}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item) =>
                              item.key === line.key
                                ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) }
                                : item,
                            ),
                          )
                        }
                        className="mt-1 text-center"
                        aria-label={`Transfer quantity for ${line.sku}`}
                        aria-invalid={line.quantity > line.available}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="mb-1 shrink-0"
                      onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      aria-label={`Remove ${line.productName}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="transferNotes">Notes</Label>
              <Textarea id="transferNotes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
            </div>

            {error ? <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => submit(false)} loading={save.isPending}>Save as draft</Button>
            <Button onClick={() => submit(true)} loading={save.isPending}>Transfer now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
