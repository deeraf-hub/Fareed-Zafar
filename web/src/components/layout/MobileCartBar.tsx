import { ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { formatPKR } from '../../lib/format';
import { useCart } from '../../store/CartContext';

/** Sticky cart summary on mobile so checkout is always one tap away. */
export const MobileCartBar = () => {
  const { itemCount, subtotal } = useCart();
  const { pathname } = useLocation();

  const hiddenOn = ['/cart', '/checkout'];
  if (itemCount === 0 || hiddenOn.includes(pathname) || pathname.startsWith('/admin')) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:hidden">
      <Link to="/cart" className="btn-primary w-full justify-between">
        <span className="flex items-center gap-2">
          <ShoppingCart className="size-4" aria-hidden="true" />
          View cart ({itemCount})
        </span>
        <span>{formatPKR(subtotal)}</span>
      </Link>
    </div>
  );
};
