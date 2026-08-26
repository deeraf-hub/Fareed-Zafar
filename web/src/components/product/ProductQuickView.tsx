import { ArrowRight, Phone, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { categoryBySlug } from '../../data/categories';
import { formatPKR } from '../../lib/format';
import { useCart } from '../../store/CartContext';
import type { Product } from '../../types';
import { Modal } from '../ui/Modal';
import { QuantityStepper } from '../ui/QuantityStepper';
import { StockBadge } from '../ui/StockBadge';
import { ProductImage } from './ProductImage';

interface ProductQuickViewProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductQuickView = ({ product, onClose }: ProductQuickViewProps) => {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  if (!product) return null;

  return (
    <Modal open onClose={onClose} title={`Quick view: ${product.name}`}>
      <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
        <ProductImage
          src={product.image}
          fallback={product.fallbackImage}
          alt={product.name}
          priority
          className="aspect-4/3 w-full rounded-xl bg-ink-50 object-cover"
        />

        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-brand-600">
            {categoryBySlug[product.category]?.name ?? product.category}
          </span>
          <h2 className="mt-1 text-xl font-semibold text-ink-900">{product.name}</h2>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-900">{formatPKR(product.price)}</span>
            {product.oldPrice && <span className="text-sm text-ink-400 line-through">{formatPKR(product.oldPrice)}</span>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StockBadge stock={product.stock} quantity={product.stockQuantity} />
            <span className="badge bg-ink-100 text-ink-600">SKU: {product.sku}</span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-600">{product.shortDescription}</p>

          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Compatible bikes</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {product.compatibleBikes.map((bike) => (
                <li key={bike} className="badge bg-ink-100 text-ink-700">
                  {bike}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(product.stockQuantity, 1)} />
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={!product.stock}
              onClick={() => {
                addItem(product.id, quantity);
                onClose();
              }}
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              {product.stock ? 'Add to Cart' : 'Out of stock'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <a href={siteConfig.phoneHref} className="btn-outline flex-1">
              <Phone className="size-4" aria-hidden="true" /> Call to ask
            </a>
            <Link to={`/shop/${product.slug}`} className="btn-outline flex-1" onClick={onClose}>
              Full details <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
};
