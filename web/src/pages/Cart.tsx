import { ArrowRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CartLineItem } from '../components/cart/CartLineItem';
import { OrderSummary } from '../components/cart/OrderSummary';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { siteConfig } from '../config/site';
import { useSeo } from '../lib/seo';
import { useCart } from '../store/CartContext';

const Cart = () => {
  const { items, subtotal, deliveryFee, total, clearCart, itemCount } = useCart();

  useSeo({
    title: `Shopping Cart | ${siteConfig.name}`,
    description: 'Review the motorcycle spare parts in your cart before checkout.',
    noindex: true,
  });

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <h1 className="section-title mb-6">Your Cart</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse the shop and add the parts you need. Your cart is saved on this device, so you can come back to it later."
          action={
            <>
              <Link to="/shop" className="btn-primary">
                Start shopping
              </Link>
              <Link to="/categories" className="btn-outline">
                Browse categories
              </Link>
            </>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="card px-5">
              <ul className="divide-y divide-ink-100">
                {items.map((item) => (
                  <CartLineItem key={item.productId} item={item} />
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Link to="/shop" className="btn-outline">
                Continue shopping
              </Link>
              <button type="button" className="btn-ghost text-ink-500" onClick={clearCart}>
                Clear cart
              </button>
            </div>
          </div>

          <div className="lg:sticky lg:top-32 lg:self-start">
            <OrderSummary
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              total={total}
              note={`${itemCount} ${itemCount === 1 ? 'item' : 'items'} · Cash on delivery available`}
            >
              <Link to="/checkout" className="btn-primary w-full">
                Proceed to checkout <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </OrderSummary>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
