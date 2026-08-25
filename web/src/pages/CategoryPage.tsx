import { PackageSearch } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductGrid } from '../components/product/ProductGrid';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { ProductGridSkeleton } from '../components/ui/Skeletons';
import { siteConfig } from '../config/site';
import { sortOptions, sortProducts } from '../lib/catalog';
import { useSeo } from '../lib/seo';
import { useCatalog } from '../store/CatalogContext';
import type { SortKey } from '../types';

const CategoryPage = () => {
  const { slug = '' } = useParams();
  const { products, categories, loading } = useCatalog();
  const [sort, setSort] = useState<SortKey>('featured');

  const category = categories.find((item) => item.slug === slug);
  const results = useMemo(
    () => sortProducts(products.filter((product) => product.category === slug), sort),
    [products, slug, sort],
  );

  useSeo({
    title: category ? `${category.name} | ${siteConfig.name}` : `Category not found | ${siteConfig.name}`,
    description: category
      ? `${category.description} Order ${category.name.toLowerCase()} online with cash on delivery across Pakistan.`
      : 'This category is not available.',
  });

  if (!loading && !category) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={PackageSearch}
          tone="error"
          as="h1"
          title="Category not found"
          description="This category may have been renamed or removed. Browse all categories instead."
          action={
            <Link to="/categories" className="btn-primary">
              All categories
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Categories', to: '/categories' },
          { label: category?.name ?? 'Category' },
        ]}
      />

      <header className="mb-8">
        <h1 className="section-title">{category?.name}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-500">{category?.description}</p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-500">
          {results.length} {results.length === 1 ? 'product' : 'products'}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="category-sort" className="text-sm text-ink-500">
            Sort by
          </label>
          <select
            id="category-sort"
            className="field h-11 w-auto py-2"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No products in this category yet"
          description="We are adding stock to this category. Message us on WhatsApp and we will tell you what is available."
          action={
            <Link to="/shop" className="btn-primary">
              Browse all parts
            </Link>
          }
        />
      ) : (
        <ProductGrid products={results} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" />
      )}
    </div>
  );
};

export default CategoryPage;
