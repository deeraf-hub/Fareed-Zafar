import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  Boxes,
  ClipboardList,
  Package,
  PackageX,
  Plus,
  ScanBarcode,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DateRangePicker } from '@/components/shared/date-range';
import { MovementBadge, QuantityDelta } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, money, number, relativeTime, variantLabel } from '@/lib/utils';

interface DashboardData {
  range: { from: string; to: string; label: string };
  cards: {
    totalProducts: number;
    totalStockUnits: number;
    inventoryValue: number | null;
    inventoryRetailValue: number | null;
    lowStockItems: number;
    outOfStock: number;
    todaySales: number;
    todaySalesCount: number;
    todayPurchases: number | null;
    todayPurchasesCount: number;
    estimatedProfit: number | null;
    rangeRevenue: number;
    rangeOrders: number;
    pendingPurchases: number;
  };
  charts: {
    sales: { date: string; total: number; count: number }[];
    purchases: { date: string; total: number; count: number }[];
    topProducts: { productId: string; name: string; units: number; revenue: number; profit: number | null }[];
    categories: { category: string; units: number; costValue: number; retailValue: number }[];
  };
  lowStock: {
    variantId: string;
    sku: string;
    name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    threshold: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    quantity: number;
    createdAt: string;
    referenceNumber: string | null;
    product: string;
    variant: string;
    sku: string;
    location: string;
    user: string;
  }[];
}

const PIE_COLORS = ['#0f172a', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const QUICK_ACTIONS = [
  { label: 'Add product', to: '/products/new', icon: Plus, permission: 'product:create' },
  { label: 'Receive stock', to: '/purchases/new', icon: Truck, permission: 'purchase:create' },
  { label: 'New sale', to: '/sales/new', icon: ShoppingBag, permission: 'sale:create' },
  { label: 'Stock adjustment', to: '/stock-adjustments?new=1', icon: SlidersHorizontal, permission: 'inventory:adjust' },
  { label: 'Stock transfer', to: '/stock-transfers?new=1', icon: ArrowLeftRight, permission: 'inventory:transfer' },
  { label: 'Stock count', to: '/stock-count?new=1', icon: ClipboardList, permission: 'inventory:count' },
  { label: 'Add supplier', to: '/suppliers?new=1', icon: Truck, permission: 'supplier:manage' },
  { label: 'Scan barcode', to: '/scan', icon: ScanBarcode, permission: 'inventory:view' },
];

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color ?? entry.fill }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium tabular">{formatter ? formatter(entry.value) : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const { can, user } = useAuth();
  const range = params.get('range') ?? 'last30';
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', range, from, to],
    queryFn: () => api.get<{ data: DashboardData }>('/dashboard', { range, from, to }).then((r) => r.data),
  });

  const updateRange = (patch: Record<string, string | undefined>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  };

  const actions = QUICK_ACTIONS.filter((action) => can(action.permission));
  const cards = data?.cards;
  const showMoney = can('report:financial');

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description={data ? `Showing ${data.range.label.toLowerCase()} · ${formatDate(data.range.from)} – ${formatDate(data.range.to)}` : 'Your inventory at a glance'}
        actions={<DateRangePicker range={range} from={from} to={to} onChange={updateRange} />}
      />

      {actions.length > 0 ? (
        <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {actions.map((action) => (
            <Button key={action.to} variant="outline" size="sm" asChild className="shrink-0">
              <Link to={action.to}>
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      {isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading || !cards ? (
        <CardSkeleton count={8} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total products"
              value={number(cards.totalProducts)}
              hint="Active products in the catalogue"
              icon={Package}
              to="/products"
            />
            <StatCard
              label="Stock units"
              value={number(cards.totalStockUnits)}
              hint="Across every location"
              icon={Boxes}
              tone="info"
              to="/inventory"
            />
            {showMoney ? (
              <>
                <StatCard
                  label="Inventory value"
                  value={money(cards.inventoryValue, { compact: true })}
                  hint={`Retail ${money(cards.inventoryRetailValue, { compact: true })}`}
                  icon={Banknote}
                  tone="success"
                  to="/reports/inventory"
                />
                <StatCard
                  label="Estimated profit"
                  value={money(cards.estimatedProfit, { compact: true })}
                  hint={`On ${money(cards.rangeRevenue, { compact: true })} revenue`}
                  icon={TrendingUp}
                  tone="success"
                  to="/reports/profit"
                />
              </>
            ) : null}
            <StatCard
              label="Low stock"
              value={number(cards.lowStockItems)}
              hint={cards.lowStockItems > 0 ? 'Variants need restocking' : 'Nothing needs restocking'}
              icon={AlertTriangle}
              tone={cards.lowStockItems > 0 ? 'warning' : 'default'}
              to="/inventory?status=LOW_STOCK"
            />
            <StatCard
              label="Out of stock"
              value={number(cards.outOfStock)}
              hint="Variants with zero stock"
              icon={PackageX}
              tone={cards.outOfStock > 0 ? 'danger' : 'default'}
              to="/inventory?status=OUT_OF_STOCK"
            />
            <StatCard
              label="Today's sales"
              value={money(cards.todaySales, { compact: true })}
              hint={`${cards.todaySalesCount} sale${cards.todaySalesCount === 1 ? '' : 's'} today`}
              icon={ShoppingBag}
              tone="info"
              to="/sales"
            />
            {showMoney ? (
              <StatCard
                label="Today's purchases"
                value={money(cards.todayPurchases, { compact: true })}
                hint={`${cards.pendingPurchases} order${cards.pendingPurchases === 1 ? '' : 's'} awaiting delivery`}
                icon={ShoppingCart}
                to="/purchases"
              />
            ) : null}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales over time</CardTitle>
                <CardDescription>Completed sales, {data.range.label.toLowerCase()}</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px] px-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.sales} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => money(value, { compact: true })}
                      width={64}
                    />
                    <Tooltip content={<ChartTooltip formatter={(value: number) => money(value)} />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Revenue"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fill="url(#salesFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {showMoney ? (
              <Card>
                <CardHeader>
                  <CardTitle>Purchases over time</CardTitle>
                  <CardDescription>Stock bought in, {data.range.label.toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent className="h-[260px] px-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.charts.purchases} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => money(value, { compact: true })}
                        width={64}
                      />
                      <Tooltip content={<ChartTooltip formatter={(value: number) => money(value)} />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="total" name="Purchases" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Top selling products</CardTitle>
                <CardDescription>By units sold, {data.range.label.toLowerCase()}</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] px-2">
                {data.charts.topProducts.length === 0 ? (
                  <EmptyState title="No sales in this period" description="Try a wider date range." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.charts.topProducts}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        width={110}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="units" name="Units sold" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory by category</CardTitle>
                <CardDescription>Retail value of stock on hand</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                {data.charts.categories.length === 0 ? (
                  <EmptyState title="No stock recorded yet" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.charts.categories}
                        dataKey="retailValue"
                        nameKey="category"
                        innerRadius="45%"
                        outerRadius="75%"
                        paddingAngle={2}
                      >
                        {data.charts.categories.map((entry, index) => (
                          <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatter={(value: number) => money(value)} />} />
                      <Legend
                        verticalAlign="bottom"
                        height={44}
                        iconType="circle"
                        formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Needs restocking</CardTitle>
                  <CardDescription>
                    {cards.lowStockItems > 0
                      ? `${cards.lowStockItems} product${cards.lowStockItems === 1 ? '' : 's'} at or below reorder level`
                      : 'Everything is above its reorder level'}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/reports/low-stock">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.lowStock.length === 0 ? (
                  <EmptyState title="Nothing needs restocking" description="Every variant is above its reorder level." />
                ) : (
                  <ul className="divide-y">
                    {data.lowStock.map((item) => (
                      <li key={item.variantId} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.sku} · {variantLabel(item)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular text-amber-600">{item.quantity} left</p>
                          <p className="text-xs text-muted-foreground">reorder at {item.threshold}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Recent activity</CardTitle>
                  <CardDescription>Every stock change, newest first</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/inventory/movements">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.recentActivity.length === 0 ? (
                  <EmptyState title="No stock movements yet" />
                ) : (
                  <ul className="divide-y">
                    {data.recentActivity.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.product}
                            {item.variant ? <span className="text-muted-foreground"> · {item.variant}</span> : null}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <MovementBadge type={item.type} />
                            <span>{item.location}</span>
                            <span>·</span>
                            <span>{item.user}</span>
                            {item.referenceNumber ? <span>· {item.referenceNumber}</span> : null}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <QuantityDelta value={item.quantity} />
                          <p className="text-xs text-muted-foreground">{relativeTime(item.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
