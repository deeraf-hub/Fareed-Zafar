import { Check, Eye, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryBySlug } from '../../data/categories';
import { discountPercent, formatPKR } from '../../lib/format';
import { stockInquiryLink } from '../../lib/whatsapp';
import { useCart } from '../../store/CartContext';
import type { Product } from '../../types';
import { StockBadge } from '../ui/StockBadge';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
}

export const ProductCard = ({ product, onQuickView }: ProductCardProps) => {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const discount = discountPercent(product.price, product.oldPrice);
  const category = categoryBySlug[product.category];

  const handleAdd = () => {
    addItem(product.id, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative">
        <Link to={`/shop/${product.slug}`} className="block aspect-4/3 overflow-hidden bg-ink-50">
          <ProductImage
            src={product.image}
            fallback={product.fallbackImage}
            alt={product.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        {discount !== null && (
          <span className="badge absolute left-3 top-3 bg-brand-600 text-white">{discount}% off</span>
        )}

        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/95 text-ink-700 shadow-sm transition-colors hover:bg-white hover:text-brand-600"
          aria-label={`Quick view: ${product.name}`}
        >
          <Eye className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link
          to={`/category/${product.category}`}
          className="text-xs font-medium uppercase tracking-wide text-brand-600 hover:underline"
        >
          {category?.name ?? product.category}
        </Link>

        <h3 className="mt-1.5 text-sm font-semibold leading-snug text-ink-900">
          <Link to={`/shop/${product.slug}`} className="hover:text-brand-600">
            {product.name}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-xs text-ink-500" title={product.compatibleBikes.join(', ')}>
          <span className="font-medium text-ink-600">Fits:</span> {product.compatibleBikes.join(', ')}
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base font-bold text-ink-900">{formatPKR(product.price)}</span>
          {product.oldPrice && (
            <span className="text-xs text-ink-400 line-through">{formatPKR(product.oldPrice)}</span>
          )}
        </div>

        <div className="mt-2">
          <StockBadge stock={product.stock} quantity={product.stockQuantity} />
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          {product.stock ? (
            <button
              type="button"
              onClick={handleAdd}
              className={`${justAdded ? 'btn-dark' : 'btn-primary'} w-full whitespace-nowrap px-2 text-xs sm:text-sm`}
            >
              {justAdded ? (
                <>
                  <Check className="size-4" aria-hidden="true" /> Added to cart
                </>
              ) : (
                <>
                  <ShoppingCart className="size-4" aria-hidden="true" /> Add to Cart
                </>
              )}
            </button>
          ) : (
            <a
              href={stockInquiryLink(product)}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-outline w-full whitespace-nowrap px-2 text-xs sm:text-sm"
            >
              Ask on WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  );
};
