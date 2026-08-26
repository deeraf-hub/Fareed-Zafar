import { Link } from 'react-router-dom';
import { bikes } from '../../data/bikes';
import type { Product } from '../../types';
import { ProductImage } from '../product/ProductImage';

export const PopularBikes = ({ products }: { products: Product[] }) => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
    {bikes.slice(0, 7).map((bike) => {
      const count = products.filter((product) => product.compatibleBikes.includes(bike.name)).length;
      return (
        <Link key={bike.id} to={`/bike/${bike.slug}`} className="card group p-3 text-center transition-shadow hover:shadow-md">
          <ProductImage
            src={bike.image}
            fallback={bike.fallbackImage}
            alt=""
            width={640}
            height={400}
            className="mx-auto aspect-16/10 w-full rounded-lg bg-ink-50 object-cover"
          />
          <h3 className="mt-3 text-sm font-semibold text-ink-900 group-hover:text-brand-600">{bike.name}</h3>
          <p className="mt-0.5 text-xs text-ink-500">{count} parts</p>
        </Link>
      );
    })}
  </div>
);
