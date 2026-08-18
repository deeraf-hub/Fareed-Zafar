import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import type { Location, VariantOption } from '@/types';
import { VariantPicker } from '@/features/variant-picker';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { QuantityDelta } from '@/components/shared/status-badge';
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
import { formatDate, humanize, variantLabel } from '@/lib/utils';

const REASONS = [
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LOST', label: 'Lost / stolen' },
  { value: 'FOUND', label: 'Found' },
  { value: 'COUNTING_ERROR', label: 'Counting error' },
  { value: 'OPENING_STOCK', label: 'Opening stock' },
  { value: 'MANUAL_CORRECTION', label: 'Manual correction' },
  { value: 'OTHER', label: 'Other' },
];

interface Line {
  key: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  currentQty: number;
  newQty: number;
}

export default function AdjustmentsPage() {
  const { state, update, reset, activeFilterCount } = useListQuery();
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = React.useState(params.get('new') === '1');
  const [locationId, setLocationId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [lines, setLines] = React.useState<Line[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, sortDir: state.sortDir, ...state.filters };

  const { data, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: ['adjustments', query],
    queryFn: () => api.get<ListResponse<any>>('/stock-adjustments', query),
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

  const addVariant = async (variant: VariantOption) => {
    if (lines.some((line) => line.variantId === variant.id)) {
      toast.error('Already added', 'That product is already on this adjustment.');
      return;
    }
    // Read the live figure at the chosen location so the operator adjusts
    // against what the system actually believes right now.
    const lookup = await api.get<{ data: any }>(`/inventory/lookup/${encodeURIComponent(variant.sku)}`);
    const atLocation = lookup.data.stockByLocation.find((row: any) => row.locationId === locationId);
    const currentQty = atLocation?.quantity ?? 0;
    setLines((current) => [
      ...current,
      {
        key: `${variant.id}-${Date.now()}`,
        variantId: variant.id,
        productName: variant.productName,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        currentQty,
        newQty: currentQty,
      },
    ]);
  };

  const save = useMutation({
    mutationFn: (payload: unknown) => api.post('/stock-adjustments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Stock adjusted', 'A movement has been recorded for every change.');
      setOpen(false);
      setLines([]);
      setReason('');
      setNotes('');
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not save the adjustment.';
      setError(message);
      toast.error('Could not save the adjustment', message);
    },
  });

  const submit = () => {
    setError(null);
    if (!locationId) return setError('Choose a location.');
    if (!reason) return setError('Choose a reason — adjustments always need one.');
    const changed = lines.filter((line) => line.newQty !== line.currentQty);
    if (changed.length === 0) return setError('Nothing has changed. Enter the new stock levels first.');
    save.mutate({
      locationId,
      reason,
      notes: notes || undefined,
      items: changed.map((line) => ({ variantId: line.variantId, newQty: line.newQty })),
    });
  };

  const adjustments = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Stock adjustments"
        description="Corrections to stock levels, each with a recorded reason."
        breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: 'Adjustments' }]}
        actions={
          can('inventory:adjust') ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              New adjustment
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={state.search}
            onChange={(value) => update({ search: value })}
            placeholder="Search adjustment number or note…"
            className="lg:max-w-sm lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
            <Select value={state.filters.locationId ?? 'all'} onChange={(event) => update({ locationId: event.target.value })} aria-label="Location" className="lg:w-[160px]">
              <option value="all">All locations</option>
              {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
            <Select value={state.filters.reason ?? 'all'} onChange={(event) => update({ reason: event.target.value })} aria-label="Reason" className="lg:w-[170px]">
              <option value="all">Any reason</option>
              {REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </div>
          {activeFilterCount > 0 || state.search ? (
            <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>
          ) : null}
        </div>

        {isError ? (
          <ErrorState message={(listError as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : adjustments.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="No stock adjustments yet"
            description="Adjustments correct the system to match what is physically on the shelf."
            action={can('inventory:adjust') ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New adjustment</Button> : null}
          />
        ) : (
          <>
            <TableWrapper>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Items adjusted</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment: any) => (
                  <TableRow key={adjustment.id}>
                    <TableCell className="font-mono text-xs font-medium">{adjustment.number}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(adjustment.adjustedAt, true)}</TableCell>
                    <TableCell>{adjustment.location.name}</TableCell>
                    <TableCell>{humanize(adjustment.reason)}</TableCell>
                    <TableCell>
                      <ul className="space-y-0.5">
                        {adjustment.items.slice(0, 3).map((item: any) => (
                          <li key={item.id} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">{item.variant.product.name} · {item.variant.sku}</span>
                            <span className="tabular text-muted-foreground">{item.previousQty} → {item.newQty}</span>
                            <QuantityDelta value={item.difference} />
                          </li>
                        ))}
                        {adjustment.items.length > 3 ? (
                          <li className="text-xs text-muted-foreground">+{adjustment.items.length - 3} more</li>
                        ) : null}
                      </ul>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{adjustment.createdBy?.name ?? '—'}</TableCell>
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
            <DialogTitle>New stock adjustment</DialogTitle>
            <DialogDescription>
              Enter the counted quantity for each item. A stock movement is written for every change.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="adjLocation" required>Location</Label>
                <Select
                  id="adjLocation"
                  value={locationId}
                  onChange={(event) => { setLocationId(event.target.value); setLines([]); }}
                >
                  {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adjReason" required>Reason</Label>
                <Select id="adjReason" value={reason} onChange={(event) => setReason(event.target.value)}>
                  <option value="">Choose a reason…</option>
                  {REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </Select>
              </div>
            </div>

            <VariantPicker locationId={locationId} onPick={addVariant} placeholder="Search or scan to add an item…" />

            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No items yet. Search above to add the products you are adjusting.
              </p>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.key} className="flex items-end gap-3 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.productName}</p>
                      <p className="truncate text-xs text-muted-foreground">{line.sku} · {variantLabel(line)}</p>
                    </div>
                    <div className="w-20 shrink-0">
                      <Label className="text-xs text-muted-foreground">System</Label>
                      <Input
                        value={line.currentQty}
                        readOnly
                        disabled
                        className="mt-1 text-center"
                        aria-label={`System quantity for ${line.sku}`}
                      />
                    </div>
                    <div className="w-24 shrink-0">
                      <Label className="text-xs text-muted-foreground">Counted</Label>
                      <Input
                        type="number"
                        min="0"
                        value={line.newQty}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item) =>
                              item.key === line.key
                                ? { ...item, newQty: Math.max(0, Number(event.target.value) || 0) }
                                : item,
                            ),
                          )
                        }
                        className="mt-1 text-center"
                        aria-label={`Counted quantity for ${line.sku}`}
                      />
                    </div>
                    <div className="w-16 shrink-0 pb-2 text-center">
                      {line.newQty !== line.currentQty ? (
                        <QuantityDelta value={line.newQty - line.currentQty} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
              <Label htmlFor="adjNotes">Notes</Label>
              <Textarea
                id="adjNotes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                placeholder="What happened? This is stored on the audit trail."
              />
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{error}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={save.isPending}>Save adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
