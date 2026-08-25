import { Bike as BikeIcon, PackageSearch } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductGrid } from '../components/product/ProductGrid';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { ProductGridSkeleton } from '../components/ui/Skeletons';
import { siteConfig } from '../config/site';
import { bikeBySlug } from '../data/bikes';
import { sortProducts } from '../lib/catalog';
import { useSeo } from '../lib/seo';
import { useCatalog } from '../store/CatalogContext';
import type { CategorySlug } from '../types';
import { ProductImage } from '../components/product/ProductImage';

const BikePage = () => {
  const { slug = '' } = useParams();
  const { products, categories, loading } = useCatalog();
  const [activeCategory, setActiveCategory] = useState<CategorySlug | 'all'>('all');

  const bike = bikeBySlug[slug];

  const compatible = useMemo(
    () => (bike ? products.filter((product) => product.compatibleBikes.includes(bike.name)) : []),
    [products, bike],
  );

  const results = useMemo(
    () =>
      sortProducts(
        activeCategory === 'all' ? compatible : compatible.filter((product) => product.category === activeCategory),
        'featured',
      ),
    [compatible, activeCategory],
  );

  useSeo({
    title: bike ? `${bike.name} Spare Parts | ${siteConfig.name}` : `Bike not found | ${siteConfig.name}`,
    description: bike
      ? `Spare parts and accessories that fit the ${bike.name}. Engine, electrical, brake, suspension and chain parts with cash on delivery in Pakistan.`
      : 'This motorcycle model is not listed.',
  });

  if (!bike) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={BikeIcon}
          tone="error"
          as="h1"
          title="Motorcycle not found"
          description="We do not have a parts page for this model yet. Browse the full shop or ask us on WhatsApp."
          action={
            <Link to="/shop" className="btn-primary">
              Browse all parts
            </Link>
          }
        />
      </div>
    );
  }

  const usedCategories = categories.filter((category) =>
    compatible.some((product) => product.category === category.slug),
  );

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, { label: bike.name }]} />

      <header className="mb-8 flex flex-col gap-6 rounded-2xl bg-ink-900 p-6 text-white sm:flex-row sm:items-center">
        <ProductImage src={bike.image} fallback={bike.fallbackImage} alt="" width={640} height={400} priority className="aspect-16/10 w-full max-w-xs rounded-xl bg-white object-cover" />
        <div>
          <span className="badge bg-white/10 text-ink-200">{bike.brand} · {bike.engineCc}cc</span>
          <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{bike.name} Spare Parts</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-300">
            {compatible.length} parts in stock listing the {bike.name} as compatible — engine, electrical, brakes,
            suspension, drive and accessories.
          </p>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`badge ${activeCategory === 'all' ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}
        >
          All parts ({compatible.length})
        </button>
        {usedCategories.map((category) => {
          const count = compatible.filter((product) => product.category === category.slug).length;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.slug)}
              className={`badge ${
                activeCategory === category.slug ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
              }`}
            >
              {category.name} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No parts listed for this selection"
          description="Try another category, or message us on WhatsApp with the part you need for this bike."
          action={
            <button type="button" className="btn-primary" onClick={() => setActiveCategory('all')}>
              Show all parts for this bike
            </button>
          }
        />
      ) : (
        <ProductGrid products={results} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" />
      )}
    </div>
  );
};

export default BikePage;
