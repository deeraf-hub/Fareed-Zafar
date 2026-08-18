import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, UserSquare2 } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import type { Customer } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useListQuery } from '@/hooks/use-list-query';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, money, number } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';

const EMPTY = { name: '', phone: '', email: '', address: '', city: '', notes: '' };

export default function CustomersPage() {
  const { state, update, reset } = useListQuery({ sortBy: 'name', sortDir: 'asc' });
  const { can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [form, setForm] = React.useState(EMPTY);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, sortBy: state.sortBy, sortDir: state.sortDir };

  const { data, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: ['customers', query],
    queryFn: () => api.get<ListResponse<Customer>>('/customers', query),
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['customer', selected],
    queryFn: () => api.get<{ data: any }>(`/customers/${selected}`).then((r) => r.data),
    enabled: Boolean(selected),
  });

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing ? api.put(`/customers/${editing.id}`, payload) : api.post('/customers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(editing ? 'Customer updated' : 'Customer added');
      setOpen(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save the customer.'),
  });

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      notes: customer.notes ?? '',
    });
    setError(null);
    setOpen(true);
  };

  const customers = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Customers"
        description="Who buys from Brandsloop, and what they have spent."
        breadcrumbs={[{ label: 'Customers' }]}
        actions={can('customer:manage') ? <Button onClick={openNew}><Plus className="h-4 w-4" />Add customer</Button> : null}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <SearchInput
              value={state.search}
              onChange={(value) => update({ search: value })}
              placeholder="Search name, phone or email…"
              className="sm:max-w-sm sm:flex-1"
            />
            {state.search ? <Button variant="ghost" size="sm" onClick={reset}>Clear</Button> : null}
          </div>

          {isError ? (
            <ErrorState message={(listError as Error).message} onRetry={() => refetch()} />
          ) : isLoading ? (
            <TableSkeleton rows={7} columns={5} />
          ) : customers.length === 0 ? (
            <EmptyState
              icon={UserSquare2}
              title={state.search ? 'No customers match your search' : 'No customers yet'}
              description="Adding customers is optional — sales can be recorded as walk-ins."
              action={can('customer:manage') ? <Button onClick={openNew}><Plus className="h-4 w-4" />Add customer</Button> : null}
            />
          ) : (
            <>
              <TableWrapper>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Total spent</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(customer.id)}
                      data-state={selected === customer.id ? 'selected' : undefined}
                    >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.phone ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.city ?? '—'}</TableCell>
                      <TableCell className="text-right tabular">{customer._count?.sales ?? 0}</TableCell>
                      <TableCell className="text-right font-medium tabular">{money(customer.totalSpent)}</TableCell>
                      <TableCell>
                        {can('customer:manage') ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(event) => { event.stopPropagation(); openEdit(customer); }}
                            aria-label={`Edit ${customer.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableWrapper>
              <Pagination meta={data?.meta} onPageChange={(page) => update({ page }, false)} onPageSizeChange={(pageSize) => update({ pageSize })} />
            </>
          )}
        </Card>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader><CardTitle>Customer profile</CardTitle></CardHeader>
          <CardContent>
            {!selected ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Select a customer to see their purchase history.
              </p>
            ) : profileLoading || !profile ? (
              <div className="space-y-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-20 w-full" /></div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[profile.phone, profile.email].filter(Boolean).join(' · ') || 'No contact details'}
                  </p>
                  {profile.address || profile.city ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {[profile.address, profile.city].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 gap-2 border-y py-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Sales</p>
                    <p className="text-lg font-semibold tabular">{number(profile.stats.purchaseCount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Spent</p>
                    <p className="text-lg font-semibold tabular">{money(profile.stats.totalSpent, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Returns</p>
                    <p className="text-lg font-semibold tabular">{number(profile.stats.returnCount)}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Recent sales</p>
                  {profile.sales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sales yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {profile.sales.slice(0, 8).map((sale: any) => (
                        <li key={sale.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0">
                            <span className="font-mono text-xs">{sale.number}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{formatDate(sale.saleDate)}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <StatusBadge status={sale.status} />
                            <span className="tabular">{money(sale.total)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {profile.notes ? (
                  <p className="border-t pt-3 text-sm text-muted-foreground">{profile.notes}</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.name}` : 'Add customer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="customerName" required>Name</Label>
              <Input id="customerName" value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input id="customerPhone" value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerEmail">Email</Label>
              <Input id="customerEmail" type="email" value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerCity">City</Label>
              <Input id="customerCity" value={form.city} onChange={(event) => setForm((c) => ({ ...c, city: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerAddress">Address</Label>
              <Input id="customerAddress" value={form.address} onChange={(event) => setForm((c) => ({ ...c, address: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerNotes">Notes</Label>
              <Textarea id="customerNotes" value={form.notes} onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))} rows={2} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                save.mutate({
                  name: form.name,
                  phone: form.phone || undefined,
                  email: form.email || undefined,
                  address: form.address || undefined,
                  city: form.city || undefined,
                  notes: form.notes || undefined,
                })
              }
              loading={save.isPending}
              disabled={!form.name.trim()}
            >
              {editing ? 'Save changes' : 'Add customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
