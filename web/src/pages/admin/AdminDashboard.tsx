import { AlertTriangle, CheckCircle2, Clock, Package, ShoppingBag, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardCard } from '../../components/admin/DashboardCard';
import { OrderStatusBadge } from '../../components/admin/OrderStatusBadge';
import { StatCardSkeleton, TableSkeleton } from '../../components/ui/Skeletons';
import { siteConfig } from '../../config/site';
import { formatDate, formatPKR } from '../../lib/format';
import { useSeo } from '../../lib/seo';
import { useCatalog } from '../../store/CatalogContext';
import { useOrders } from '../../store/OrdersContext';

const AdminDashboard = () => {
  const { products, loading: catalogLoading } = useCatalog();
  const { orders, loading: ordersLoading } = useOrders();

  useSeo({ title: `Dashboard | Admin | ${siteConfig.name}`, description: 'Store overview.', noindex: true });

  const pending = orders.filter((order) => ['pending', 'confirmed', 'processing', 'packed'].includes(order.status));
  const completed = orders.filter((order) => order.status === 'delivered');
  const totalSales = completed.reduce((sum, order) => sum + order.total, 0);
  const lowStock = products.filter((product) => product.stockQuantity <= siteConfig.lowStockThreshold);
  const recentOrders = [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">Overview of products, orders and stock.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {catalogLoading || ordersLoading ? (
          Array.from({ length: 6 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <DashboardCard label="Total products" value={products.length} icon={Package} hint={`${products.filter((p) => p.stock).length} in stock`} />
            <DashboardCard label="Total orders" value={orders.length} icon={ShoppingBag} />
            <DashboardCard label="Pending orders" value={pending.length} icon={Clock} tone="warning" hint="Not yet delivered or cancelled" />
            <DashboardCard label="Completed orders" value={completed.length} icon={CheckCircle2} tone="success" />
            <DashboardCard label="Total sales" value={formatPKR(totalSales)} icon={Wallet} hint="Delivered orders only" />
            <DashboardCard
              label="Low stock products"
              value={lowStock.length}
              icon={AlertTriangle}
              tone="warning"
              hint={`At or below ${siteConfig.lowStockThreshold} units`}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>

          {ordersLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th scope="col" className="py-2 pr-3 font-medium">Order</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Customer</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Total</th>
                    <th scope="col" className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3 pr-3">
                        <Link to={`/admin/orders/${order.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                          {order.orderNumber}
                        </Link>
                        <span className="block text-xs text-ink-500">{formatDate(order.createdAt)}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="block text-ink-900">{order.customer.name}</span>
                        <span className="block text-xs text-ink-500">{order.customer.phone}</span>
                      </td>
                      <td className="py-3 pr-3 font-medium text-ink-900">{formatPKR(order.total)}</td>
                      <td className="py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Low stock</h2>
            <Link to="/admin/products" className="text-sm font-medium text-brand-600 hover:underline">
              Manage
            </Link>
          </div>

          {catalogLoading ? (
            <TableSkeleton rows={5} columns={2} />
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-ink-500">Every product is above the low-stock threshold.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {lowStock.slice(0, 8).map((product) => (
                <li key={product.id} className="flex items-center gap-3 py-3">
                  <img src={product.image} alt="" width={480} height={360} loading="lazy" className="size-10 rounded-lg bg-ink-50 object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${product.id}`} className="block truncate text-sm font-medium text-ink-900 hover:text-brand-600">
                      {product.name}
                    </Link>
                    <span className="text-xs text-ink-500">{product.sku}</span>
                  </div>
                  <span className={`badge ${product.stockQuantity === 0 ? 'bg-ink-200 text-ink-700' : 'bg-amber-100 text-amber-800'}`}>
                    {product.stockQuantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
