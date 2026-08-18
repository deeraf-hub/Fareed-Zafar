import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { QuantityDelta, StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/shared/search-input';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, money, variantLabel } from '@/lib/utils';

export default function StockCountDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [counted, setCounted] = React.useState<Record<string, string>>({});
  const [filter, setFilter] = React.useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['stock-count', id],
    queryFn: () => api.get<{ data: any }>(`/stock-counts/${id}`).then((r) => r.data),
  });

  React.useEffect(() => {
    if (!data) return;
    setCounted(
      Object.fromEntries(
        data.items.map((item: any) => [item.variantId, item.countedQty == null ? '' : String(item.countedQty)]),
      ),
    );
  }, [data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-count', id] });
    queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveSheet = useMutation({
    mutationFn: () =>
      api.put(`/stock-counts/${id}/items`, {
        items: data.items.map((item: any) => ({
          variantId: item.variantId,
          countedQty: counted[item.variantId] === '' ? null : Number(counted[item.variantId]),
        })),
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Count sheet saved', 'Nothing has been adjusted yet — finalise when you are ready.');
    },
    onError: (err) => toast.error('Could not save the count', (err as Error).message),
  });

  const finalize = useMutation({
    mutationFn: () => api.post<{ message: string }>(`/stock-counts/${id}/finalize`, { confirm: true }),
    onSuccess: (response) => {
      invalidate();
      toast.success('Count finalised', response.message);
    },
    onError: (err) => toast.error('Could not finalise the count', (err as Error).message),
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/stock-counts/${id}/cancel`),
    onSuccess: () => {
      invalidate();
      toast.toast({ title: 'Count cancelled', variant: 'warning' });
    },
    onError: (err) => toast.error('Could not cancel the count', (err as Error).message),
  });

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72 w-full" /></div>;
  }

  const editable = data.status === 'IN_PROGRESS' || data.status === 'DRAFT';
  const rows = data.items.filter((item: any) => {
    if (!filter) return true;
    const term = filter.toLowerCase();
    return (
      item.variant.sku.toLowerCase().includes(term) ||
      item.variant.product.name.toLowerCase().includes(term) ||
      (item.variant.color ?? '').toLowerCase().includes(term) ||
      (item.variant.size ?? '').toLowerCase().includes(term)
    );
  });

  const differences = data.items.filter(
    (item: any) => counted[item.variantId] !== '' && Number(counted[item.variantId]) !== item.systemQty,
  );
  const countedCount = data.items.filter((item: any) => counted[item.variantId] !== '').length;
  const varianceValue = differences.reduce(
    (sum: number, item: any) =>
      sum + (Number(counted[item.variantId]) - item.systemQty) * Number(item.variant.costPrice),
    0,
  );

  const onFinalize = async () => {
    const confirmed = await confirm({
      title: `Finalise ${data.number}?`,
      description:
        differences.length === 0
          ? 'No differences were found, so no stock will change. The count will be closed.'
          : `${differences.length} item(s) differ from the system. Finalising writes a stock movement for each one. This cannot be undone.`,
      confirmLabel: 'Finalise and adjust',
      destructive: differences.length > 0,
    });
    if (!confirmed) return;
    // Persist any unsaved entries before applying them.
    await saveSheet.mutateAsync();
    finalize.mutate();
  };

  return (
    <>
      <PageHeader
        title={data.number}
        description={`${data.location.name} · started ${formatDate(data.startedAt, true)}`}
        breadcrumbs={[{ label: 'Stock counts', to: '/stock-count' }, { label: data.number }]}
        actions={
          editable && can('inventory:count') ? (
            <>
              <Button variant="outline" onClick={() => cancel.mutate()} loading={cancel.isPending}>
                <Ban className="h-4 w-4" />
                <span className="hidden sm:inline">Cancel count</span>
              </Button>
              <Button variant="secondary" onClick={() => saveSheet.mutate()} loading={saveSheet.isPending}>
                <Save className="h-4 w-4" />
                Save progress
              </Button>
              <Button onClick={onFinalize} loading={finalize.isPending}>
                <CheckCircle2 className="h-4 w-4" />
                Finalise
              </Button>
            </>
          ) : null
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p><div className="mt-2"><StatusBadge status={data.status} /></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Counted</p><p className="mt-1 text-2xl font-semibold tabular">{countedCount} / {data.items.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Differences</p><p className="mt-1 text-2xl font-semibold tabular">{differences.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Variance value</p><p className={`mt-1 text-2xl font-semibold tabular ${varianceValue < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{money(varianceValue)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Count sheet</CardTitle>
          <SearchInput value={filter} onChange={setFilter} placeholder="Filter by product, SKU, colour or size…" className="mt-3 max-w-sm" />
        </CardHeader>
        <CardContent className="p-0">
          <TableWrapper>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">System stock</TableHead>
                <TableHead className="text-right">Physical count</TableHead>
                <TableHead className="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item: any) => {
                const value = counted[item.variantId] ?? '';
                const difference = value === '' ? null : Number(value) - item.systemQty;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.variant.product.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.variant.sku}</TableCell>
                    <TableCell>{variantLabel(item.variant)}</TableCell>
                    <TableCell className="text-right tabular">{item.systemQty}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        disabled={!editable}
                        value={value}
                        onChange={(event) =>
                          setCounted((current) => ({ ...current, [item.variantId]: event.target.value }))
                        }
                        className="ml-auto w-24 text-center"
                        placeholder="—"
                        aria-label={`Physical count for ${item.variant.sku}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {difference === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : difference === 0 ? (
                        <span className="text-sm text-emerald-600">Match</span>
                      ) : (
                        <QuantityDelta value={difference} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableWrapper>
        </CardContent>
      </Card>
    </>
  );
}
