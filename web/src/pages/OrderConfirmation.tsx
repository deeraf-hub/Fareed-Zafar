import { CheckCircle2, MessageCircle, PackageX, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { OrderStatusTracker } from '../components/order/OrderStatusTracker';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { siteConfig } from '../config/site';
import { formatDateTime, formatPKR } from '../lib/format';
import { useSeo } from '../lib/seo';
import { orderInquiryLink } from '../lib/whatsapp';
import { useOrders } from '../store/OrdersContext';

const paymentLabels: Record<string, string> = {
  cod: 'Cash on Delivery',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  'bank-transfer': 'Bank Transfer',
};

const OrderConfirmation = () => {
  const { orderNumber = '' } = useParams();
  const { getOrderByNumber } = useOrders();
  const order = getOrderByNumber(orderNumber);

  useSeo({
    title: `Order ${orderNumber} | ${siteConfig.name}`,
    description: 'Your order confirmation.',
    noindex: true,
  });

  if (!order) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={PackageX}
          tone="error"
          as="h1"
          title="Order not found"
          description={`We could not find order ${orderNumber} on this device. Use the Track Order page with your order number and mobile number, or contact us on WhatsApp.`}
          action={
            <>
              <Link to="/track-order" className="btn-primary">
                Track an order
              </Link>
              <Link to="/shop" className="btn-outline">
                Back to shop
              </Link>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Order confirmation' }]} />

      <div className="card mb-6 flex flex-col items-start gap-4 border-emerald-200 bg-emerald-50 p-6 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Order Placed Successfully!</h1>
          <p className="mt-1 text-sm text-ink-600">
            Thank you for shopping with {siteConfig.name}. We will call you on {order.customer.phone} to confirm the
            order before dispatch.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-500">Order number</p>
                <p className="text-lg font-bold text-ink-900">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-ink-500">Placed on</p>
                <p className="text-sm font-medium text-ink-900">{formatDateTime(order.createdAt)}</p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="mb-4 text-sm font-semibold text-ink-900">Order status</h2>
              <OrderStatusTracker status={order.status} />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold text-ink-900">Ordered products</h2>
            <ul className="mt-4 divide-y divide-ink-100">
              {order.items.map((item) => (
                <li key={item.productId} className="flex items-center gap-3 py-3">
                  <img src={item.image} alt="" width={480} height={360} loading="lazy" className="size-14 rounded-lg bg-ink-50 object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/shop/${item.slug}`} className="truncate text-sm font-medium text-ink-900 hover:text-brand-600">
                      {item.name}
                    </Link>
                    <p className="text-xs text-ink-500">
                      SKU {item.sku} · {item.quantity} × {formatPKR(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink-900">{formatPKR(item.total)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold text-ink-900">Delivery details</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">Customer</dt>
                <dd className="font-medium text-ink-900">{order.customer.name}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Mobile</dt>
                <dd className="font-medium text-ink-900">{order.customer.phone}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-500">Delivery address</dt>
                <dd className="font-medium text-ink-900">
                  {order.customer.address}, {order.customer.area}, {order.customer.city}
                  {order.customer.postalCode ? ` ${order.customer.postalCode}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Payment method</dt>
                <dd className="font-medium text-ink-900">{paymentLabels[order.paymentMethod]}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Order status</dt>
                <dd className="font-medium capitalize text-ink-900">{order.status}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="card p-5">
            <h2 className="text-base font-semibold text-ink-900">Payment summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-medium text-ink-900">{formatPKR(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Delivery</dt>
                <dd className="font-medium text-ink-900">{order.deliveryFee === 0 ? 'Free' : formatPKR(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
                <dt className="font-semibold text-ink-900">Total</dt>
                <dd className="font-bold text-ink-900">{formatPKR(order.total)}</dd>
              </div>
            </dl>
          </div>

          <Link to={`/track-order?order=${order.orderNumber}`} className="btn-primary w-full">
            Track Your Order
          </Link>
          <a href={orderInquiryLink(order)} target="_blank" rel="noreferrer noopener" className="btn-whatsapp w-full">
            <MessageCircle className="size-4" aria-hidden="true" /> Send order on WhatsApp
          </a>
          <button type="button" className="btn-outline w-full" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" /> Print this page
          </button>
          <Link to="/shop" className="btn-ghost w-full">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
