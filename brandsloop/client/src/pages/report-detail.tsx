import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, FileText, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category, Location, Supplier } from '@/types';
import type { ListResponse } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { DateRangePicker } from '@/components/shared/date-range';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { downloadBlob, formatDate, humanize, money, number } from '@/lib/utils';

type Column = { key: string; label: string; align?: 'left' | 'right'; format?: 'money' | 'number' | 'date' | 'humanize' };

interface ReportConfig {
  title: string;
  description: string;
  permission: string;
  columns: Column[];
  filters?: ('location' | 'category' | 'supplier')[];
  dateRange?: boolean;
}

const REPORTS: Record<string, ReportConfig> = {
  inventory: {
    title: 'Inventory report',
    description: 'Stock on hand valued at cost and at retail.',
    permission: 'report:view',
    filters: ['location', 'category', 'supplier'],
    columns: [
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'variant', label: 'Variant' },
      { key: 'category', label: 'Category' },
      { key: 'location', label: 'Location' },
      { key: 'quantity', label: 'Stock', align: 'right', format: 'number' },
      { key: 'costPrice', label: 'Cost', align: 'right', format: 'money' },
      { key: 'sellingPrice', label: 'Price', align: 'right', format: 'money' },
      { key: 'costValue', label: 'Cost value', align: 'right', format: 'money' },
      { key: 'retailValue', label: 'Retail value', align: 'right', format: 'money' },
    ],
  },
  'stock-movements': {
    title: 'Stock movement report',
    description: 'Every stock change in the selected period.',
    permission: 'report:view',
    dateRange: true,
    filters: ['location'],
    columns: [
      { key: 'date', label: 'Date', format: 'date' },
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'variant', label: 'Variant' },
      { key: 'location', label: 'Location' },
      { key: 'type', label: 'Type', format: 'humanize' },
      { key: 'quantity', label: 'Change', align: 'right', format: 'number' },
      { key: 'newQty', label: 'New qty', align: 'right', format: 'number' },
      { key: 'reference', label: 'Reference' },
      { key: 'user', label: 'User' },
    ],
  },
  purchases: {
    title: 'Purchase report',
    description: 'Orders raised in the selected period.',
    permission: 'report:view',
    dateRange: true,
    filters: ['location', 'supplier'],
    columns: [
      { key: 'number', label: 'Purchase #' },
      { key: 'date', label: 'Date', format: 'date' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status', format: 'humanize' },
      { key: 'units', label: 'Units', align: 'right', format: 'number' },
      { key: 'received', label: 'Received', align: 'right', format: 'number' },
      { key: 'total', label: 'Total', align: 'right', format: 'money' },
      { key: 'outstanding', label: 'Outstanding', align: 'right', format: 'money' },
    ],
  },
  sales: {
    title: 'Sales report',
    description: 'Completed sales in the selected period.',
    permission: 'report:view',
    dateRange: true,
    filters: ['location'],
    columns: [
      { key: 'number', label: 'Sale #' },
      { key: 'date', label: 'Date', format: 'date' },
      { key: 'customer', label: 'Customer' },
      { key: 'location', label: 'Location' },
      { key: 'units', label: 'Units', align: 'right', format: 'number' },
      { key: 'discount', label: 'Discount', align: 'right', format: 'money' },
      { key: 'total', label: 'Total', align: 'right', format: 'money' },
      { key: 'paymentMethod', label: 'Payment', format: 'humanize' },
    ],
  },
  profit: {
    title: 'Profit report',
    description: 'Revenue less the cost of goods sold, by product.',
    permission: 'report:financial',
    dateRange: true,
    filters: ['location', 'category'],
    columns: [
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'units', label: 'Units sold', align: 'right', format: 'number' },
      { key: 'revenue', label: 'Revenue', align: 'right', format: 'money' },
      { key: 'cost', label: 'Cost', align: 'right', format: 'money' },
      { key: 'profit', label: 'Gross profit', align: 'right', format: 'money' },
      { key: 'margin', label: 'Margin %', align: 'right' },
    ],
  },
  'low-stock': {
    title: 'Low stock report',
    description: 'Items at or below their reorder level.',
    permission: 'report:view',
    columns: [
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'variant', label: 'Variant' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'quantity', label: 'Stock', align: 'right', format: 'number' },
      { key: 'threshold', label: 'Reorder level', align: 'right', format: 'number' },
      { key: 'shortfall', label: 'Shortfall', align: 'right', format: 'number' },
    ],
  },
  'out-of-stock': {
    title: 'Out of stock report',
    description: 'Active variants with nothing left to sell.',
    permission: 'report:view',
    columns: [
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'variant', label: 'Variant' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'threshold', label: 'Reorder level', align: 'right', format: 'number' },
    ],
  },
  damaged: {
    title: 'Damaged stock report',
    description: 'Damaged and lost stock, with the cost written off.',
    permission: 'report:view',
    dateRange: true,
    filters: ['location'],
    columns: [
      { key: 'date', label: 'Date', format: 'date' },
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'variant', label: 'Variant' },
      { key: 'location', label: 'Location' },
      { key: 'type', label: 'Type', format: 'humanize' },
      { key: 'quantity', label: 'Units', align: 'right', format: 'number' },
      { key: 'costValue', label: 'Cost value', align: 'right', format: 'money' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  suppliers: {
    title: 'Supplier report',
    description: 'Spend and balances by supplier.',
    permission: 'report:view',
    dateRange: true,
    columns: [
      { key: 'supplier', label: 'Supplier' },
      { key: 'products', label: 'Products', align: 'right', format: 'number' },
      { key: 'orders', label: 'Orders', align: 'right', format: 'number' },
      { key: 'units', label: 'Units', align: 'right', format: 'number' },
      { key: 'total', label: 'Total purchased', align: 'right', format: 'money' },
      { key: 'paid', label: 'Paid', align: 'right', format: 'money' },
      { key: 'outstanding', label: 'Outstanding', align: 'right', format: 'money' },
    ],
  },
  categories: {
    title: 'Category report',
    description: 'Stock value and sales performance by category.',
    permission: 'report:view',
    dateRange: true,
    columns: [
      { key: 'category', label: 'Category' },
      { key: 'products', label: 'Products', align: 'right', format: 'number' },
      { key: 'units', label: 'Stock units', align: 'right', format: 'number' },
      { key: 'costValue', label: 'Cost value', align: 'right', format: 'money' },
      { key: 'retailValue', label: 'Retail value', align: 'right', format: 'money' },
      { key: 'unitsSold', label: 'Units sold', align: 'right', format: 'number' },
      { key: 'revenue', label: 'Revenue', align: 'right', format: 'money' },
    ],
  },
  'product-performance': {
    title: 'Product performance',
    description: 'Which products sell, and what is left on the shelf.',
    permission: 'report:view',
    dateRange: true,
    filters: ['category'],
    columns: [
      { key: 'product', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'Category' },
      { key: 'unitsSold', label: 'Units sold', align: 'right', format: 'number' },
      { key: 'revenue', label: 'Revenue', align: 'right', format: 'money' },
      { key: 'stock', label: 'Stock on hand', align: 'right', format: 'number' },
    ],
  },
};

function formatCell(value: unknown, column: Column) {
  if (value === null || value === undefined || value === '') return '—';
  switch (column.format) {
    case 'money': return money(value as number);
    case 'number': return number(value as number);
    case 'date': return formatDate(value as string, true);
    case 'humanize': return humanize(value as string);
    default: return String(value);
  }
}

export default function ReportDetailPage() {
  const { report } = useParams();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { can } = useAuth();

  const config = report ? REPORTS[report] : undefined;

  const range = params.get('range') ?? 'last30';
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;
  const locationId = params.get('locationId') ?? undefined;
  const categoryId = params.get('categoryId') ?? undefined;
  const supplierId = params.get('supplierId') ?? undefined;

  const query = { range, from, to, locationId, categoryId, supplierId, limit: 500 };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['report', report, query],
    queryFn: () => api.get<{ data: any[]; totals?: Record<string, number>; series?: any[] }>(`/reports/${report}`, query),
    // Skip the request entirely when the role cannot see this report, rather
    // than firing it and handling the 403.
    enabled: Boolean(config) && Boolean(config && can(config.permission)),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ data: Location[] }>('/locations').then((r) => r.data),
    enabled: config?.filters?.includes('location'),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ data: Category[] }>('/categories').then((r) => r.data),
    enabled: config?.filters?.includes('category'),
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.get<ListResponse<Supplier>>('/suppliers', { pageSize: 200 }).then((r) => r.data),
    enabled: config?.filters?.includes('supplier') && can('supplier:view'),
  });

  if (!config) return <Navigate to="/reports" replace />;

  // Reports carry their own permission on top of the route guard: /reports is
  // open to every role, but the profit report is financial data that staff
  // must not see. The API refuses it too — this just gives a clean screen
  // instead of an error toast.
  if (!can(config.permission)) {
    return (
      <>
        <PageHeader
          title={config.title}
          breadcrumbs={[{ label: 'Reports', to: '/reports' }, { label: config.title }]}
        />
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="You do not have access to this report"
            description="This report contains financial data. Ask an administrator if you need it."
            action={
              <Button variant="outline" asChild>
                <Link to="/reports">Back to reports</Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const update = (patch: Record<string, string | undefined>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (!value || value === 'all') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const exportCsv = async () => {
    try {
      const { blob, filename } = await api.download(`/reports/${report}`, { ...query, limit: 5000 }, `${report}.csv`);
      downloadBlob(blob, filename);
      toast.success('Export ready', 'The export matches the filters on screen.');
    } catch (err) {
      toast.error('Export failed', (err as Error).message);
    }
  };

  const rows = data?.data ?? [];

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        breadcrumbs={[{ label: 'Reports', to: '/reports' }, { label: config.title }]}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          {config.dateRange ? (
            <DateRangePicker range={range} from={from} to={to} onChange={update} />
          ) : null}
          {config.filters?.includes('location') ? (
            <Select value={locationId ?? 'all'} onChange={(event) => update({ locationId: event.target.value })} aria-label="Location" className="w-[170px]">
              <option value="all">All locations</option>
              {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
          ) : null}
          {config.filters?.includes('category') ? (
            <Select value={categoryId ?? 'all'} onChange={(event) => update({ categoryId: event.target.value })} aria-label="Category" className="w-[170px]">
              <option value="all">All categories</option>
              {categories?.filter((c) => !c.parentId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          ) : null}
          {config.filters?.includes('supplier') && can('supplier:view') ? (
            <Select value={supplierId ?? 'all'} onChange={(event) => update({ supplierId: event.target.value })} aria-label="Supplier" className="w-[180px]">
              <option value="all">All suppliers</option>
              {suppliers?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </Select>
          ) : null}
        </CardContent>
      </Card>

      {data?.totals ? (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(data.totals).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular">
                  {key.toLowerCase().includes('margin')
                    ? `${Number(value ?? 0).toFixed(2)}%`
                    : key.toLowerCase().includes('unit') || key === 'orders'
                      ? number(value)
                      : money(value)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {data?.series && data.series.length > 0 ? (
        <Card className="mb-5">
          <CardHeader><CardTitle>Trend</CardTitle></CardHeader>
          <CardContent className="h-[260px] px-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(value) => money(value, { compact: true })}
                />
                <Tooltip formatter={(value: number) => money(value)} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cost" name="Cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        {isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton rows={10} columns={config.columns.length} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing to report"
            description="No records match these filters. Try a wider date range."
          />
        ) : (
          <TableWrapper>
            <TableHeader>
              <TableRow>
                {config.columns.map((column) => (
                  <TableHead key={column.key} className={column.align === 'right' ? 'text-right' : undefined}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  {config.columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={
                        column.align === 'right'
                          ? 'whitespace-nowrap text-right tabular'
                          : 'max-w-[16rem] truncate'
                      }
                    >
                      {formatCell(row[column.key], column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </TableWrapper>
        )}
      </Card>
    </>
  );
}
