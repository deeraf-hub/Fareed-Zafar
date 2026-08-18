import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, ShieldCheck, UserX, Users } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { useListQuery } from '@/hooks/use-list-query';
import { formatDate, humanize } from '@/lib/utils';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_SUMMARY = [
  { role: 'ADMIN', description: 'Full access, including users, settings and audit logs.' },
  { role: 'MANAGER', description: 'Everything operational — products, stock, buying, selling and reports. No user management.' },
  { role: 'STAFF', description: 'Shop floor: record sales, receive stock, look products up. No deletions, no financial reports.' },
];

const EMPTY = { name: '', email: '', password: '', role: 'STAFF', phone: '', isActive: true };

export default function UsersPage() {
  const { state, update, reset } = useListQuery();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [form, setForm] = React.useState(EMPTY);
  const [error, setError] = React.useState<string | null>(null);

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, ...state.filters };

  const { data, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: ['users', query],
    queryFn: () => api.get<ListResponse<UserRow>>('/users', query),
  });

  const save = useMutation({
    mutationFn: (payload: any) => (editing ? api.put(`/users/${editing.id}`, payload) : api.post('/users', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(editing ? 'User updated' : 'User created');
      setOpen(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save the user.'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/users/${id}`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.toast({ title: 'User deactivated', description: response.message, variant: 'warning' });
    },
    onError: (err) => toast.error('Could not deactivate the user', (err as Error).message),
  });

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, phone: user.phone ?? '', isActive: user.isActive });
    setError(null);
    setOpen(true);
  };

  const onDeactivate = async (user: UserRow) => {
    const confirmed = await confirm({
      title: `Deactivate ${user.name}?`,
      description:
        'They will not be able to sign in. The account is kept so their name stays on every sale and stock movement they recorded.',
      confirmLabel: 'Deactivate',
      destructive: true,
    });
    if (confirmed) deactivate.mutate(user.id);
  };

  const users = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in, and what they are allowed to do."
        breadcrumbs={[{ label: 'Users' }]}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" />Add user</Button>}
      />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Roles</CardTitle>
          <CardDescription>Permissions are enforced on the server, not just hidden in the interface.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {ROLE_SUMMARY.map((item) => (
            <div key={item.role} className="rounded-lg border p-3">
              <Badge variant={item.role === 'ADMIN' ? 'default' : item.role === 'MANAGER' ? 'info' : 'secondary'}>
                {humanize(item.role)}
              </Badge>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={state.search}
            onChange={(value) => update({ search: value })}
            placeholder="Search name or email…"
            className="sm:max-w-sm sm:flex-1"
          />
          <Select
            value={state.filters.role ?? 'all'}
            onChange={(event) => update({ role: event.target.value })}
            aria-label="Role"
            className="sm:ml-auto sm:w-[150px]"
          >
            <option value="all">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Staff</option>
          </Select>
          {state.search || state.filters.role ? <Button variant="ghost" size="sm" onClick={reset}>Clear</Button> : null}
        </div>

        {isError ? (
          <ErrorState message={(listError as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" action={<Button onClick={openNew}><Plus className="h-4 w-4" />Add user</Button>} />
        ) : (
          <>
            <TableWrapper>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last signed in</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name}
                      {user.id === currentUser?.id ? (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'ADMIN' ? 'default' : user.role === 'MANAGER' ? 'info' : 'secondary'}>
                        {humanize(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.lastLoginAt, true)}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'success' : 'muted'}>{user.isActive ? 'Active' : 'Deactivated'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {user.isActive && user.id !== currentUser?.id ? (
                          <Button variant="ghost" size="icon-sm" onClick={() => onDeactivate(user)} aria-label={`Deactivate ${user.name}`}>
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableWrapper>
            <Pagination meta={data?.meta} onPageChange={(page) => update({ page }, false)} onPageSizeChange={(pageSize) => update({ pageSize })} />
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add user'}</DialogTitle>
            <DialogDescription>
              Passwords need 8+ characters with an uppercase letter, a lowercase letter and a number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="userName" required>Full name</Label>
              <Input id="userName" value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userEmail" required>Email</Label>
              <Input id="userEmail" type="email" value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userPassword" required={!editing}>
                {editing ? 'New password (leave blank to keep)' : 'Password'}
              </Label>
              <Input
                id="userPassword"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userRole">Role</Label>
              <Select id="userRole" value={form.role} onChange={(event) => setForm((c) => ({ ...c, role: event.target.value }))}>
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userPhone">Phone</Label>
              <Input id="userPhone" value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((c) => ({ ...c, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              Can sign in
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                save.mutate({
                  name: form.name,
                  email: form.email,
                  role: form.role,
                  phone: form.phone || undefined,
                  isActive: form.isActive,
                  ...(form.password ? { password: form.password } : {}),
                })
              }
              loading={save.isPending}
              disabled={!form.name.trim() || !form.email.trim() || (!editing && !form.password)}
            >
              {editing ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
