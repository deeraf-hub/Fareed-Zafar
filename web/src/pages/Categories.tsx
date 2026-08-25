import { CategoryGrid } from '../components/home/CategoryGrid';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { siteConfig } from '../config/site';
import { useSeo } from '../lib/seo';
import { useCatalog } from '../store/CatalogContext';

const Categories = () => {
  const { categories, products } = useCatalog();

  useSeo({
    title: `Spare Part Categories | ${siteConfig.name}`,
    description:
      'Browse motorcycle spare parts by category: engine, electrical, brake, suspension, chain and sprocket, controls, body parts and accessories.',
  });

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Categories' }]} />
      <header className="mb-8">
        <h1 className="section-title">Shop by Category</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-500">
          Parts are grouped the way a workshop looks for them — pick a category to see everything we stock in it.
        </p>
      </header>
      <CategoryGrid categories={categories} products={products} />
    </div>
  );
};

export default Categories;
