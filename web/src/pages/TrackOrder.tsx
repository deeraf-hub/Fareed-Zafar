import { CircleAlert, MessageCircle, PackageSearch, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OrderStatusTracker } from '../components/order/OrderStatusTracker';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { siteConfig } from '../config/site';
import { formatDateTime, formatPKR } from '../lib/format';
import { useSeo } from '../lib/seo';
import { generalInquiryLink } from '../lib/whatsapp';
import { useOrders } from '../store/OrdersContext';
import type { Order } from '../types';
import { ProductImage } from '../components/product/ProductImage';

const TrackOrder = () => {
  const [params] = useSearchParams();
  const { findOrder, loading } = useOrders();
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useSeo({
    title: `Track Your Order | ${siteConfig.name}`,
    description: 'Check the status of your motorcycle spare parts order using your order number and mobile number.',
  });

  useEffect(() => {
    setOrderNumber(params.get('order') ?? '');
  }, [params]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!orderNumber.trim()) {
      setError('Enter the order number from your confirmation, for example QAS-10001.');
      return;
    }
    if (!phone.trim()) {
      setError('Enter the mobile number used when placing the order.');
      return;
    }

    setSearching(true);
    // Simulates the round trip a real backend would make.
    window.setTimeout(() => {
      const found = findOrder(orderNumber, phone);
      if (!found) {
        setError(
          'No order matches that order number and mobile number. Check both, or contact us on WhatsApp and we will look it up.',
        );
      } else {
        setResult(found);
      }
      setSearching(false);
    }, 350);
  };

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Track Order' }]} />

      <div className="mx-auto max-w-3xl">
        <h1 className="section-title">Track Your Order</h1>
        <p className="mt-2 text-sm text-ink-500">
          Enter your order number and the mobile number you used at checkout to see where your parts are.
        </p>

        <form onSubmit={handleSubmit} className="card mt-6 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="order-number" className="field-label">
              Order number
            </label>
            <input
              id="order-number"
              type="text"
              className="field"
              placeholder="QAS-10001"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="order-phone" className="field-label">
              Mobile number
            </label>
            <input
              id="order-phone"
              type="tel"
              inputMode="tel"
              className="field"
              placeholder="0300 1234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={searching || loading}>
            <Search className="size-4" aria-hidden="true" />
            {searching ? 'Checking…' : 'Track order'}
          </button>
        </form>

        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {searching && (
          <div className="mt-6 space-y-3" aria-hidden="true">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-24 w-full" />
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <section className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-500">Order</p>
                  <p className="text-lg font-bold text-ink-900">{result.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-ink-500">Placed on</p>
                  <p className="text-sm font-medium text-ink-900">{formatDateTime(result.createdAt)}</p>
                </div>
              </div>
              <div className="mt-6">
                <OrderStatusTracker status={result.status} />
              </div>
              <p className="mt-6 text-xs text-ink-500">Last updated {formatDateTime(result.updatedAt)}</p>
            </section>

            <section className="card p-5">
              <h2 className="text-base font-semibold text-ink-900">Items in this order</h2>
              <ul className="mt-4 divide-y divide-ink-100">
                {result.items.map((item) => (
                  <li key={item.productId} className="flex items-center gap-3 py-3">
                    <ProductImage src={item.image} fallback={item.fallbackImage} alt="" className="size-12 rounded-lg bg-ink-50 object-cover" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/shop/${item.slug}`} className="truncate text-sm font-medium text-ink-900 hover:text-brand-600">
                        {item.name}
                      </Link>
                      <p className="text-xs text-ink-500">
                        {item.quantity} × {formatPKR(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ink-900">{formatPKR(item.total)}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-ink-100 pt-4 text-sm">
                <span className="font-semibold text-ink-900">Total</span>
                <span className="font-bold text-ink-900">{formatPKR(result.total)}</span>
              </div>
            </section>
          </div>
        )}

        {!result && !error && !searching && (
          <div className="mt-8 flex flex-col items-start gap-3 rounded-xl border border-ink-200 bg-ink-50 p-5 sm:flex-row sm:items-center">
            <PackageSearch className="size-6 shrink-0 text-ink-400" aria-hidden="true" />
            <p className="flex-1 text-sm text-ink-600">
              Lost your order number? Message us on WhatsApp with the mobile number you ordered from and we will find it.
            </p>
            <a href={generalInquiryLink()} target="_blank" rel="noreferrer noopener" className="btn-whatsapp">
              <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
