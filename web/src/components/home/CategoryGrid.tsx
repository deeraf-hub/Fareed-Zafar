import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Category, Product } from '../../types';

interface CategoryGridProps {
  categories: Category[];
  products: Product[];
}

export const CategoryGrid = ({ categories, products }: CategoryGridProps) => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
    {categories.map((category) => {
      const count = products.filter((product) => product.category === category.slug).length;
      return (
        <Link
          key={category.id}
          to={`/category/${category.slug}`}
          className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md"
        >
          <div className="aspect-4/3 overflow-hidden bg-ink-50">
            <img
              src={category.image}
              alt=""
              width={480}
              height={360}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          </div>
          <div className="flex flex-1 flex-col p-4">
            <h3 className="text-sm font-semibold text-ink-900 group-hover:text-brand-600">{category.name}</h3>
            <p className="mt-1 text-xs text-ink-500">{count} {count === 1 ? 'product' : 'products'}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
              Browse <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      );
    })}
  </div>
);
