import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Location } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { humanize, money, number } from '@/lib/utils';

const EMPTY = { name: '', code: '', type: 'STORE', address: '', city: '', isActive: true, isDefault: false };

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Location | null>(null);
  const [form, setForm] = React.useState(EMPTY);
  const [error, setError] = React.useState<string | null>(null);

  const { data, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing ? api.put(`/locations/${editing.id}`, payload) : api.post('/locations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success(editing ? 'Location updated' : 'Location added');
      setOpen(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save the location.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location deleted');
    },
    onError: (err) => toast.error('Could not delete the location', (err as Error).message),
  });

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (location: Location) => {
    setEditing(location);
    setForm({
      name: location.name,
      code: location.code,
      type: location.type,
      address: location.address ?? '',
      city: location.city ?? '',
      isActive: location.isActive,
      isDefault: location.isDefault,
    });
    setError(null);
    setOpen(true);
  };

  const onDelete = async (location: Location) => {
    const confirmed = await confirm({
      title: `Delete ${location.name}?`,
      description: 'A location holding stock or with movement history cannot be deleted — deactivate it instead.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) remove.mutate(location.id);
  };

  const locations = data ?? [];

  return (
    <>
      <PageHeader
        title="Locations"
        description="Stock is tracked separately at each store, warehouse and outlet."
        breadcrumbs={[{ label: 'Locations' }]}
        actions={can('location:manage') ? <Button onClick={openNew}><Plus className="h-4 w-4" />Add location</Button> : null}
      />

      {isError ? (
        <ErrorState message={(listError as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40" />)}
        </div>
      ) : locations.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title="No locations yet"
            description="Add at least one location so stock has somewhere to live."
            action={can('location:manage') ? <Button onClick={openNew}><Plus className="h-4 w-4" />Add location</Button> : null}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      {location.name}
                      {location.isDefault ? (
                        <span title="Default location"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /></span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {location.code} · {humanize(location.type)}
                    </p>
                    {location.city ? <p className="mt-0.5 text-xs text-muted-foreground">{location.city}</p> : null}
                  </div>
                  {can('location:manage') ? (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(location)} aria-label={`Edit ${location.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => onDelete(location)} aria-label={`Delete ${location.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Units</p>
                    <p className="font-semibold tabular">{number(location.totalUnits)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cost value</p>
                    <p className="font-semibold tabular">{money(location.costValue, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Retail</p>
                    <p className="font-semibold tabular">{money(location.retailValue, { compact: true })}</p>
                  </div>
                </div>

                {!location.isActive ? <Badge variant="muted" className="mt-3">Inactive</Badge> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.name}` : 'Add location'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="locationName" required>Name</Label>
              <Input id="locationName" value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} autoFocus placeholder="e.g. Main Store" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locationCode" required>Short code</Label>
              <Input
                id="locationCode"
                value={form.code}
                onChange={(event) => setForm((c) => ({ ...c, code: event.target.value.toUpperCase() }))}
                placeholder="e.g. MAIN"
                maxLength={12}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Used in compact stock displays.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locationType">Type</Label>
              <Select id="locationType" value={form.type} onChange={(event) => setForm((c) => ({ ...c, type: event.target.value }))}>
                <option value="STORE">Store</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="OUTLET">Outlet</option>
                <option value="ONLINE">Online warehouse</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locationCity">City</Label>
              <Input id="locationCity" value={form.city} onChange={(event) => setForm((c) => ({ ...c, city: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locationAddress">Address</Label>
              <Input id="locationAddress" value={form.address} onChange={(event) => setForm((c) => ({ ...c, address: event.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) => setForm((c) => ({ ...c, isDefault: event.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              Default location for new sales and purchases
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((c) => ({ ...c, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              Active
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => save.mutate({ ...form, address: form.address || undefined, city: form.city || undefined })}
              loading={save.isPending}
              disabled={!form.name.trim() || !form.code.trim()}
            >
              {editing ? 'Save changes' : 'Add location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
