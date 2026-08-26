import { CircleAlert, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckoutForm } from '../components/cart/CheckoutForm';
import type { CheckoutFormValues } from '../components/cart/CheckoutForm';
import { OrderSummary } from '../components/cart/OrderSummary';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { siteConfig } from '../config/site';
import { formatPKR } from '../lib/format';
import { useSeo } from '../lib/seo';
import { useCart } from '../store/CartContext';
import { useOrders } from '../store/OrdersContext';
import { ProductImage } from '../components/product/ProductImage';

const Checkout = () => {
  const { items, subtotal, deliveryFee, total, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: `Checkout | ${siteConfig.name}`,
    description: 'Complete your motorcycle spare parts order with cash on delivery.',
    noindex: true,
  });

  const handleSubmit = (values: CheckoutFormValues) => {
    setSubmitting(true);
    setError(null);

    try {
      const outOfStock = items.filter((item) => !item.product.stock);
      if (outOfStock.length > 0) {
        setError(
          `${outOfStock.map((item) => item.product.name).join(', ')} went out of stock. Remove it from your cart to continue.`,
        );
        setSubmitting(false);
        return;
      }

      const { paymentMethod, ...customer } = values;
      const order = placeOrder({ customer, items, paymentMethod });
      clearCart();
      navigate(`/order-confirmation/${order.orderNumber}`, { replace: true });
    } catch {
      setError('We could not place the order. Please try again, or call the shop and we will take it over the phone.');
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShoppingCart}
          title="There is nothing to check out"
          description="Add parts to your cart first, then come back to complete the order."
          action={
            <Link to="/shop" className="btn-primary">
              Browse parts
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
      <h1 className="section-title mb-6">Checkout</h1>

      {error && (
        <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <CheckoutForm onSubmit={handleSubmit} submitting={submitting} />

        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="card mb-4 p-5">
            <h2 className="text-base font-semibold text-ink-900">Your items</h2>
            <ul className="mt-4 space-y-4">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <ProductImage
                    src={item.product.image}
                    fallback={item.product.fallbackImage}
                    alt=""
                    className="size-14 shrink-0 rounded-lg bg-ink-50 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{item.product.name}</p>
                    <p className="text-xs text-ink-500">
                      {item.quantity} × {formatPKR(item.product.price)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink-900">{formatPKR(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </div>

          <OrderSummary
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
            note="Totals are confirmed by our team before dispatch."
          />
        </div>
      </div>
    </div>
  );
};

export default Checkout;
