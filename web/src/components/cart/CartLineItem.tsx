import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPKR } from '../../lib/format';
import { useCart } from '../../store/CartContext';
import type { CartLineDetailed } from '../../types';
import { QuantityStepper } from '../ui/QuantityStepper';
import { StockBadge } from '../ui/StockBadge';
import { ProductImage } from '../product/ProductImage';

export const CartLineItem = ({ item }: { item: CartLineDetailed }) => {
  const { setQuantity, removeItem } = useCart();
  const { product } = item;

  return (
    <li className="flex gap-4 py-5">
      <Link to={`/shop/${product.slug}`} className="shrink-0">
        <ProductImage
          src={product.image}
          fallback={product.fallbackImage}
          alt={product.name}
          className="size-24 rounded-lg bg-ink-50 object-cover sm:size-28"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink-900">
              <Link to={`/shop/${product.slug}`} className="hover:text-brand-600">
                {product.name}
              </Link>
            </h3>
            <p className="mt-1 text-xs text-ink-500">SKU: {product.sku}</p>
            <p className="mt-1 line-clamp-1 text-xs text-ink-500">Fits: {product.compatibleBikes.join(', ')}</p>
          </div>
          <p className="text-sm font-bold text-ink-900">{formatPKR(item.lineTotal)}</p>
        </div>

        <div className="mt-2">
          <StockBadge stock={product.stock} quantity={product.stockQuantity} />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          <QuantityStepper
            value={item.quantity}
            onChange={(value) => setQuantity(product.id, value)}
            min={1}
            max={Math.max(product.stockQuantity, 1)}
            size="sm"
            label={`Quantity for ${product.name}`}
          />
          <div className="flex items-center gap-4">
            <span className="text-xs text-ink-500">{formatPKR(product.price)} each</span>
            <button
              type="button"
              onClick={() => removeItem(product.id)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
              <span className="sr-only">{product.name} from cart</span>
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};
