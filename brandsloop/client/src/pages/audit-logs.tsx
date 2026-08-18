import { useQuery } from '@tanstack/react-query';
import { Download, FileClock } from 'lucide-react';
import { api, type ListResponse } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useListQuery } from '@/hooks/use-list-query';
import { downloadBlob, formatDate, humanize } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string } | null;
}

function summarise(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'object') return String(value);
  return Object.entries(value as Record<string, unknown>)
    .slice(0, 4)
    .map(([key, item]) => `${key}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`)
    .join(', ');
}

export default function AuditLogsPage() {
  const { state, update, reset, activeFilterCount } = useListQuery();
  const toast = useToast();

  const query = { page: state.page, pageSize: state.pageSize, search: state.search, ...state.filters };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => api.get<ListResponse<AuditLog>>('/audit-logs', query),
  });

  const { data: options } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: () => api.get<{ data: { actions: string[]; entities: string[] } }>('/audit-logs/actions').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const exportCsv = async () => {
    try {
      const { blob, filename } = await api.download('/audit-logs', query, 'audit-log.csv');
      downloadBlob(blob, filename);
      toast.success('Export ready');
    } catch (err) {
      toast.error('Export failed', (err as Error).message);
    }
  };

  const logs = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Who changed what, and when. Records here are never edited or removed."
        breadcrumbs={[{ label: 'Audit log' }]}
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />

      <Card>
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              value={state.search}
              onChange={(value) => update({ search: value })}
              placeholder="Search action, entity or user…"
              className="lg:max-w-sm lg:flex-1"
            />
            {activeFilterCount > 0 || state.search ? (
              <Button variant="ghost" size="sm" onClick={reset} className="self-start lg:ml-auto">Clear filters</Button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Select value={state.filters.entity ?? 'all'} onChange={(event) => update({ entity: event.target.value })} aria-label="Entity">
              <option value="all">All record types</option>
              {options?.entities.map((entity) => <option key={entity} value={entity}>{entity}</option>)}
            </Select>
            <Select value={state.filters.action ?? 'all'} onChange={(event) => update({ action: event.target.value })} aria-label="Action">
              <option value="all">All actions</option>
              {options?.actions.map((action) => <option key={action} value={action}>{action}</option>)}
            </Select>
            <Input type="date" value={state.filters.from ?? ''} onChange={(event) => update({ from: event.target.value })} aria-label="From date" />
            <Input type="date" value={state.filters.to ?? ''} onChange={(event) => update({ to: event.target.value })} aria-label="To date" />
          </div>
        </div>

        {isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={10} columns={6} />
        ) : logs.length === 0 ? (
          <EmptyState icon={FileClock} title="No audit entries found" description="Adjust the filters to see more." />
        ) : (
          <>
            <TableWrapper>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Before</TableHead>
                  <TableHead>After</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(log.createdAt, true)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{log.user?.name ?? 'System'}</p>
                      {log.user ? <p className="text-xs text-muted-foreground">{humanize(log.user.role)}</p> : null}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{log.action}</Badge></TableCell>
                    <TableCell>
                      <p>{log.entity}</p>
                      {log.entityId ? (
                        <p className="font-mono text-[11px] text-muted-foreground">{log.entityId.slice(0, 12)}…</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground" title={summarise(log.before)}>
                      {summarise(log.before)}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground" title={summarise(log.after)}>
                      {summarise(log.after)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ip ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableWrapper>
            <Pagination meta={data?.meta} onPageChange={(page) => update({ page }, false)} onPageSizeChange={(pageSize) => update({ pageSize })} />
          </>
        )}
      </Card>
    </>
  );
}
