import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OrderStatusBadge, orderStatuses } from '../../components/admin/OrderStatusBadge';
import { TableSkeleton } from '../../components/ui/Skeletons';
import { siteConfig } from '../../config/site';
import { formatDate, formatPKR } from '../../lib/format';
import { useSeo } from '../../lib/seo';
import { useOrders } from '../../store/OrdersContext';
import type { OrderStatus } from '../../types';

const AdminOrders = () => {
  const { orders, loading, updateOrderStatus } = useOrders();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');

  useSeo({ title: `Orders | Admin | ${siteConfig.name}`, description: 'Manage orders.', noindex: true });

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    return orders
      .filter((order) => (status === 'all' ? true : order.status === status))
      .filter((order) => {
        if (!term) return true;
        if (order.orderNumber.toLowerCase().includes(term)) return true;
        if (order.customer.name.toLowerCase().includes(term)) return true;
        return digits.length > 0 && order.customer.phone.replace(/\D/g, '').includes(digits);
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [orders, query, status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Orders</h1>
        <p className="mt-1 text-sm text-ink-500">{orders.length} orders in total.</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <label htmlFor="admin-order-search" className="sr-only">
              Search orders
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              id="admin-order-search"
              type="search"
              className="field pl-10"
              placeholder="Search order number, customer or phone"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="admin-order-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="admin-order-status"
              className="field w-auto capitalize"
              value={status}
              onChange={(event) => setStatus(event.target.value as OrderStatus | 'all')}
            >
              <option value="all">All statuses</option>
              {orderStatuses.map((item) => (
                <option key={item} value={item} className="capitalize">
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-5">
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No orders match this filter.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="py-2 pr-3 font-medium">Order ID</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Customer</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Products</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Total</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Payment</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Date</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 pr-3">
                      <Link to={`/admin/orders/${order.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                        {order.orderNumber}
                      </Link>
                      {order.isDemo && <span className="badge ml-2 bg-ink-100 text-ink-500">demo</span>}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="block text-ink-900">{order.customer.name}</span>
                      <span className="block text-xs text-ink-500">{order.customer.phone}</span>
                    </td>
                    <td className="py-3 pr-3 text-ink-600">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </td>
                    <td className="py-3 pr-3 font-medium text-ink-900">{formatPKR(order.total)}</td>
                    <td className="py-3 pr-3 uppercase text-ink-600">{order.paymentMethod}</td>
                    <td className="py-3 pr-3 text-ink-600">{formatDate(order.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={order.status} />
                        <label className="sr-only" htmlFor={`status-${order.id}`}>
                          Change status for {order.orderNumber}
                        </label>
                        <select
                          id={`status-${order.id}`}
                          className="field h-9 w-auto py-1 text-xs capitalize"
                          value={order.status}
                          onChange={(event) => updateOrderStatus(order.id, event.target.value as OrderStatus)}
                        >
                          {orderStatuses.map((item) => (
                            <option key={item} value={item} className="capitalize">
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
