import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCheck, PackageX, Trash2 } from 'lucide-react';
import { api, type ListResponse } from '@/lib/api';
import type { Notification } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useListQuery } from '@/hooks/use-list-query';
import { cn, formatDate, relativeTime } from '@/lib/utils';

const ICONS = { OUT_OF_STOCK: PackageX, LOW_STOCK: AlertTriangle } as const;

export default function NotificationsPage() {
  const { state, update } = useListQuery();
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = { page: state.page, pageSize: state.pageSize, ...state.filters };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', query],
    queryFn: () => api.get<ListResponse<Notification>>('/notifications', query),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      invalidate();
      toast.success('All notifications marked as read');
    },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: invalidate,
  });

  const notifications = data?.data ?? [];
  const unread = data?.meta.unread ?? 0;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'You are all caught up.'}
        breadcrumbs={[{ label: 'Notifications' }]}
        actions={
          <>
            <Select
              value={state.filters.type ?? 'all'}
              onChange={(event) => update({ type: event.target.value })}
              aria-label="Notification type"
              className="w-[190px]"
            >
              <option value="all">All notifications</option>
              <option value="LOW_STOCK">Low stock</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
              <option value="PENDING_PURCHASE">Pending purchases</option>
              <option value="SYSTEM">System</option>
            </Select>
            {unread > 0 ? (
              <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
                <CheckCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Mark all read</span>
              </Button>
            ) : null}
          </>
        }
      />

      <Card>
        {isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nothing to show"
            description="Low-stock and out-of-stock alerts appear here as soon as stock moves."
            action={<Button variant="outline" asChild><Link to="/inventory">Go to inventory</Link></Button>}
          />
        ) : (
          <>
            <ul className="divide-y">
              {notifications.map((notification) => {
                const Icon = ICONS[notification.type as keyof typeof ICONS] ?? Bell;
                return (
                  <li
                    key={notification.id}
                    className={cn('flex items-start gap-3 p-4', !notification.isRead && 'bg-accent/40')}
                  >
                    <Icon
                      className={cn(
                        'mt-0.5 h-5 w-5 shrink-0',
                        notification.level === 'CRITICAL' ? 'text-destructive' : 'text-amber-600',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {relativeTime(notification.createdAt)} · {formatDate(notification.createdAt, true)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {notification.entityId && notification.entity === 'ProductVariant' ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/inventory?search=${encodeURIComponent(notification.message.match(/\(([^)]+)\)/)?.[1] ?? '')}`}>
                            View stock
                          </Link>
                        </Button>
                      ) : null}
                      {!notification.isRead ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => markOne.mutate(notification.id)}
                          aria-label="Mark as read"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove.mutate(notification.id)}
                        aria-label="Dismiss notification"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination meta={data?.meta} onPageChange={(page) => update({ page }, false)} />
          </>
        )}
      </Card>
    </>
  );
}
