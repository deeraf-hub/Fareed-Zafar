import { useState } from 'react';
import type { Product } from '../../types';
import { ProductQuickView } from './ProductQuickView';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  /** Tailwind grid classes, overridden on narrow layouts like the home page. */
  className?: string;
}

export const ProductGrid = ({ products, className }: ProductGridProps) => {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  return (
    <>
      <div className={className ?? 'grid grid-cols-2 gap-4 lg:grid-cols-4'}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onQuickView={setQuickViewProduct} />
        ))}
      </div>
      <ProductQuickView product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </>
  );
};
