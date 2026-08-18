import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Truck } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import type { Supplier } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useListQuery } from '@/hooks/use-list-query';
import { useAuth } from '@/hooks/use-auth';
import { money } from '@/lib/utils';

const EMPTY = {
  name: '', contactPerson: '', phone: '', email: '', address: '', city: '', taxNumber: '', notes: '',
  status: 'ACTIVE' as const,
};

export default function SuppliersPage() {
  const { state, update, reset } = useListQuery({ sortBy: 'name', sortDir: 'asc' });
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | null>(null);
  const [form, setForm] = React.useState<typeof EMPTY>(EMPTY);
  const [error, setError] = React.useState<string | null>(null);

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, sortBy: state.sortBy, sortDir: state.sortDir, ...state.filters };

  const { data, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: ['suppliers', query],
    queryFn: () => api.get<ListResponse<Supplier>>('/suppliers', query),
  });

  React.useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(null);
      setForm(EMPTY);
      setOpen(true);
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('new');
        return next;
      }, { replace: true });
    }
  }, [params, setParams]);

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing ? api.put(`/suppliers/${editing.id}`, payload) : api.post('/suppliers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(editing ? 'Supplier updated' : 'Supplier added');
      setOpen(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save the supplier.'),
  });

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      city: supplier.city ?? '',
      taxNumber: supplier.taxNumber ?? '',
      notes: supplier.notes ?? '',
      status: supplier.status as 'ACTIVE',
    });
    setError(null);
    setOpen(true);
  };

  const suppliers = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who Brandsloop buys from, and what is still owed."
        breadcrumbs={[{ label: 'Suppliers' }]}
        actions={can('supplier:manage') ? <Button onClick={openNew}><Plus className="h-4 w-4" />Add supplier</Button> : null}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={state.search}
            onChange={(value) => update({ search: value })}
            placeholder="Search name, contact, phone or city…"
            className="sm:max-w-sm sm:flex-1"
          />
          <Select
            value={state.filters.status ?? 'all'}
            onChange={(event) => update({ status: event.target.value })}
            aria-label="Status"
            className="sm:ml-auto sm:w-[150px]"
          >
            <option value="all">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
          {state.search || state.filters.status ? <Button variant="ghost" size="sm" onClick={reset}>Clear</Button> : null}
        </div>

        {isError ? (
          <ErrorState message={(listError as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={state.search ? 'No suppliers match your search' : 'No suppliers yet'}
            description="Add the mills and wholesalers you buy stock from."
            action={can('supplier:manage') ? <Button onClick={openNew}><Plus className="h-4 w-4" />Add supplier</Button> : null}
          />
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {suppliers.map((supplier) => (
                <li key={supplier.id}>
                  <Link to={`/suppliers/${supplier.id}`} className="block p-4 active:bg-accent">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{supplier.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[supplier.contactPerson, supplier.phone].filter(Boolean).join(' · ') || 'No contact details'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular">{money(supplier.totalPurchases)}</p>
                        <p className="text-xs text-muted-foreground">purchased</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <TableWrapper>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="text-right">Total purchased</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <Link to={`/suppliers/${supplier.id}`} className="font-medium hover:underline">{supplier.name}</Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{supplier.contactPerson ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{supplier.phone ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{supplier.city ?? '—'}</TableCell>
                      <TableCell className="text-right tabular">{supplier._count?.products ?? 0}</TableCell>
                      <TableCell className="text-right tabular">{money(supplier.totalPurchases)}</TableCell>
                      <TableCell className="text-right tabular font-medium">{money(supplier.outstandingBalance)}</TableCell>
                      <TableCell><StatusBadge status={supplier.status} /></TableCell>
                      <TableCell>
                        {can('supplier:manage') ? (
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(supplier)} aria-label={`Edit ${supplier.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableWrapper>
            </div>

            <Pagination meta={data?.meta} onPageChange={(page) => update({ page }, false)} onPageSizeChange={(pageSize) => update({ pageSize })} />
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.name}` : 'Add supplier'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="supplierName" required>Supplier name</Label>
              <Input id="supplierName" value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact person</Label>
              <Input id="contactPerson" value={form.contactPerson} onChange={(event) => setForm((c) => ({ ...c, contactPerson: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplierPhone">Phone</Label>
              <Input id="supplierPhone" value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplierEmail">Email</Label>
              <Input id="supplierEmail" type="email" value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplierCity">City</Label>
              <Input id="supplierCity" value={form.city} onChange={(event) => setForm((c) => ({ ...c, city: event.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="supplierAddress">Address</Label>
              <Input id="supplierAddress" value={form.address} onChange={(event) => setForm((c) => ({ ...c, address: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxNumber">Tax / NTN number</Label>
              <Input id="taxNumber" value={form.taxNumber} onChange={(event) => setForm((c) => ({ ...c, taxNumber: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplierStatus">Status</Label>
              <Select id="supplierStatus" value={form.status} onChange={(event) => setForm((c) => ({ ...c, status: event.target.value as 'ACTIVE' }))}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="supplierNotes">Notes</Label>
              <Textarea id="supplierNotes" value={form.notes} onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))} rows={2} />
            </div>
            {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                save.mutate({
                  ...form,
                  contactPerson: form.contactPerson || undefined,
                  phone: form.phone || undefined,
                  email: form.email || undefined,
                  address: form.address || undefined,
                  city: form.city || undefined,
                  taxNumber: form.taxNumber || undefined,
                  notes: form.notes || undefined,
                })
              }
              loading={save.isPending}
              disabled={!form.name.trim()}
            >
              {editing ? 'Save changes' : 'Add supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
