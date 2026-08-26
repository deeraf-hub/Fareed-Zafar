import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { OrderStatusBadge, orderStatuses } from '../../components/admin/OrderStatusBadge';
import { OrderStatusTracker } from '../../components/order/OrderStatusTracker';
import { siteConfig } from '../../config/site';
import { formatDateTime, formatPKR } from '../../lib/format';
import { useSeo } from '../../lib/seo';
import { useOrders } from '../../store/OrdersContext';
import type { OrderStatus } from '../../types';
import { ProductImage } from '../../components/product/ProductImage';

const AdminOrderDetail = () => {
  const { id = '' } = useParams();
  const { orders, updateOrderStatus } = useOrders();
  const order = orders.find((item) => item.id === id);

  useSeo({
    title: `${order?.orderNumber ?? 'Order'} | Admin | ${siteConfig.name}`,
    description: 'Order details.',
    noindex: true,
  });

  if (!order) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-600">This order was not found.</p>
        <Link to="/admin/orders" className="btn-primary mt-4">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink-900">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
          {order.isDemo && <span className="badge bg-ink-100 text-ink-500">demo order</span>}
        </div>
        <p className="mt-1 text-sm text-ink-500">
          Placed {formatDateTime(order.createdAt)} &middot; Updated {formatDateTime(order.updatedAt)}
        </p>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-900">Order status</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="order-status" className="text-sm text-ink-500">
              Change status
            </label>
            <select
              id="order-status"
              className="field h-11 w-auto py-2 capitalize"
              value={order.status}
              onChange={(event) => updateOrderStatus(order.id, event.target.value as OrderStatus)}
            >
              {orderStatuses.map((status) => (
                <option key={status} value={status} className="capitalize">
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6">
          <OrderStatusTracker status={order.status} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-5">
          <h2 className="text-base font-semibold text-ink-900">Products</h2>
          <ul className="mt-4 divide-y divide-ink-100">
            {order.items.map((item) => (
              <li key={item.productId} className="flex items-center gap-3 py-3">
                <ProductImage src={item.image} fallback={item.fallbackImage} alt="" className="size-12 rounded-lg bg-ink-50 object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to={`/shop/${item.slug}`} className="block truncate text-sm font-medium text-ink-900 hover:text-brand-600">
                    {item.name}
                  </Link>
                  <span className="text-xs text-ink-500">
                    {item.sku} &middot; {item.quantity} &times; {formatPKR(item.unitPrice)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-ink-900">{formatPKR(item.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="font-medium text-ink-900">{formatPKR(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Delivery</dt>
              <dd className="font-medium text-ink-900">{order.deliveryFee === 0 ? 'Free' : formatPKR(order.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-semibold text-ink-900">Total</dt>
              <dd className="font-bold text-ink-900">{formatPKR(order.total)}</dd>
            </div>
          </dl>
        </section>

        <section className="card space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Customer</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-ink-500">Name</dt>
                <dd className="font-medium text-ink-900">{order.customer.name}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Phone</dt>
                <dd className="font-medium text-ink-900">{order.customer.phone}</dd>
              </div>
              {order.customer.email && (
                <div>
                  <dt className="text-ink-500">Email</dt>
                  <dd className="font-medium text-ink-900">{order.customer.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-ink-500">Address</dt>
                <dd className="font-medium text-ink-900">
                  {order.customer.address}, {order.customer.area}, {order.customer.city}
                  {order.customer.postalCode ? ` ${order.customer.postalCode}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Payment</dt>
                <dd className="font-medium uppercase text-ink-900">{order.paymentMethod}</dd>
              </div>
              {order.customer.notes && (
                <div>
                  <dt className="text-ink-500">Notes</dt>
                  <dd className="font-medium text-ink-900">{order.customer.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="space-y-2 border-t border-ink-100 pt-4">
            <a href={`tel:${order.customer.phone.replace(/\s/g, '')}`} className="btn-outline w-full">
              <Phone className="size-4" aria-hidden="true" /> Call customer
            </a>
            {order.customer.email && (
              <a
                href={`mailto:${order.customer.email}?subject=${encodeURIComponent(
                  `${siteConfig.name} — order ${order.orderNumber}`,
                )}`}
                className="btn-outline w-full"
              >
                <Mail className="size-4" aria-hidden="true" /> Email customer
              </a>
            )}
            <p className="text-xs text-ink-500">
              Customer notifications are sent manually until a notification service is connected.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
