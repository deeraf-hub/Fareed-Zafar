import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import type { Category, Location } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useListQuery } from '@/hooks/use-list-query';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function StockCountPage() {
  const { state, update, reset, activeFilterCount } = useListQuery();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = React.useState(false);
  const [locationId, setLocationId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, sortDir: state.sortDir, ...state.filters };

  const { data, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: ['stock-counts', query],
    queryFn: () => api.get<ListResponse<any>>('/stock-counts', query),
  });
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ data: Category[] }>('/categories').then((r) => r.data),
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

  const start = useMutation({
    mutationFn: () =>
      api.post<{ data: any }>('/stock-counts', {
        locationId,
        categoryId: categoryId || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      toast.success('Stock count started', 'Enter the physical quantities, then finalise.');
      setOpen(false);
      navigate(`/stock-count/${response.data.id}`);
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not start the count.';
      setError(message);
      toast.error('Could not start the count', message);
    },
  });

  const counts = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Stock counts"
        description="Count what is physically on the shelf and reconcile the system to match."
        breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: 'Stock counts' }]}
        actions={
          can('inventory:count') ? (
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Start a count</Button>
          ) : null
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={state.search}
            onChange={(value) => update({ search: value })}
            placeholder="Search count number…"
            className="lg:max-w-sm lg:flex-1"
          />
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
            <Select value={state.filters.status ?? 'all'} onChange={(event) => update({ status: event.target.value })} aria-label="Status" className="lg:w-[160px]">
              <option value="all">Any status</option>
              <option value="IN_PROGRESS">In progress</option>
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
        ) : counts.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No stock counts yet"
            description="A stock count compares the system against a physical count and adjusts the difference."
            action={can('inventory:count') ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Start a count</Button> : null}
          />
        ) : (
          <>
            <TableWrapper>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.map((count: any) => (
                  <TableRow key={count.id}>
                    <TableCell>
                      <Link to={`/stock-count/${count.id}`} className="font-mono text-xs font-medium hover:underline">
                        {count.number}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(count.startedAt, true)}</TableCell>
                    <TableCell>{count.location.name}</TableCell>
                    <TableCell className="text-right tabular">{count._count?.items ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(count.completedAt)}</TableCell>
                    <TableCell><StatusBadge status={count.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{count.createdBy?.name ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableWrapper>
            <Pagination meta={data?.meta} onPageChange={(page) => update({ page }, false)} onPageSizeChange={(pageSize) => update({ pageSize })} />
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Start a stock count</DialogTitle>
            <DialogDescription>
              A count sheet is created with the system quantity for every active product at this location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="countLocation" required>Location</Label>
              <Select id="countLocation" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="countCategory">Limit to a category</Label>
              <Select id="countCategory" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">Count everything</option>
                {categories?.filter((c) => !c.parentId).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">Counting one category at a time keeps the sheet manageable.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="countNotes">Notes</Label>
              <Textarea id="countNotes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
            </div>
            {error ? <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => start.mutate()} loading={start.isPending}>Start count</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
