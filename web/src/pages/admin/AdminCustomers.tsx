import { Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TableSkeleton } from '../../components/ui/Skeletons';
import { siteConfig } from '../../config/site';
import { formatDate, formatPKR } from '../../lib/format';
import { useSeo } from '../../lib/seo';
import { useOrders } from '../../store/OrdersContext';
import type { Order } from '../../types';

interface CustomerRecord {
  key: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  orders: Order[];
  totalSpent: number;
  lastOrderAt: string;
}

/** Customers are derived from orders until a customers table exists. */
const buildCustomers = (orders: Order[]): CustomerRecord[] => {
  const map = new Map<string, CustomerRecord>();

  for (const order of orders) {
    const key = order.customer.phone.replace(/\D/g, '');
    const existing = map.get(key);
    if (existing) {
      existing.orders.push(order);
      existing.totalSpent += order.status === 'cancelled' ? 0 : order.total;
      if (Date.parse(order.createdAt) > Date.parse(existing.lastOrderAt)) existing.lastOrderAt = order.createdAt;
    } else {
      map.set(key, {
        key,
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        city: order.customer.city,
        orders: [order],
        totalSpent: order.status === 'cancelled' ? 0 : order.total,
        lastOrderAt: order.createdAt,
      });
    }
  }

  return [...map.values()].sort((a, b) => Date.parse(b.lastOrderAt) - Date.parse(a.lastOrderAt));
};

const AdminCustomers = () => {
  const { orders, loading } = useOrders();
  const [expanded, setExpanded] = useState<string | null>(null);

  useSeo({ title: `Customers | Admin | ${siteConfig.name}`, description: 'Customer records.', noindex: true });

  const customers = useMemo(() => buildCustomers(orders), [orders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Customers</h1>
        <p className="mt-1 text-sm text-ink-500">
          {customers.length} customers, grouped by mobile number from their order history.
        </p>
      </div>

      <div className="card p-5">
        {loading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Users className="size-8 text-ink-300" aria-hidden="true" />
            <p className="mt-3 text-sm text-ink-500">No customers yet. They appear here once an order is placed.</p>
          </div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="py-2 pr-3 font-medium">Customer</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Phone</th>
                  <th scope="col" className="py-2 pr-3 font-medium">City</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Orders</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Total spent</th>
                  <th scope="col" className="py-2 font-medium">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {customers.map((customer) => (
                  <>
                    <tr key={customer.key}>
                      <td className="py-3 pr-3">
                        <button
                          type="button"
                          className="text-left font-medium text-ink-900 hover:text-brand-600"
                          onClick={() => setExpanded(expanded === customer.key ? null : customer.key)}
                          aria-expanded={expanded === customer.key}
                        >
                          {customer.name}
                        </button>
                        {customer.email && <span className="block text-xs text-ink-500">{customer.email}</span>}
                      </td>
                      <td className="py-3 pr-3 text-ink-600">{customer.phone}</td>
                      <td className="py-3 pr-3 text-ink-600">{customer.city}</td>
                      <td className="py-3 pr-3 text-ink-600">{customer.orders.length}</td>
                      <td className="py-3 pr-3 font-medium text-ink-900">{formatPKR(customer.totalSpent)}</td>
                      <td className="py-3 text-ink-600">{formatDate(customer.lastOrderAt)}</td>
                    </tr>
                    {expanded === customer.key && (
                      <tr key={`${customer.key}-detail`} className="bg-ink-50">
                        <td colSpan={6} className="p-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Order history</h3>
                          <ul className="mt-2 space-y-1.5 text-sm">
                            {customer.orders.map((order) => (
                              <li key={order.id} className="flex flex-wrap items-center gap-3">
                                <Link to={`/admin/orders/${order.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                                  {order.orderNumber}
                                </Link>
                                <span className="text-ink-500">{formatDate(order.createdAt)}</span>
                                <span className="capitalize text-ink-500">{order.status}</span>
                                <span className="font-medium text-ink-900">{formatPKR(order.total)}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomers;
