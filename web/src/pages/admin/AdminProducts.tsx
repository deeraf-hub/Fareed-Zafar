import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TableSkeleton } from '../../components/ui/Skeletons';
import { siteConfig } from '../../config/site';
import { formatPKR } from '../../lib/format';
import { searchScore } from '../../lib/catalog';
import { useSeo } from '../../lib/seo';
import { useCatalog } from '../../store/CatalogContext';
import { ProductImage } from '../../components/product/ProductImage';

const AdminProducts = () => {
  const { products, categories, loading, updateProduct, deleteProduct } = useCatalog();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useSeo({ title: `Products | Admin | ${siteConfig.name}`, description: 'Manage products.', noindex: true });

  const filtered = useMemo(() => {
    const base = category === 'all' ? products : products.filter((product) => product.category === category);
    if (!query.trim()) return base;
    return base.filter((product) => searchScore(product, query) > 0);
  }, [products, category, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Products</h1>
          <p className="mt-1 text-sm text-ink-500">{products.length} products in the catalogue.</p>
        </div>
        <Link to="/admin/products/new" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" /> Add product
        </Link>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <label htmlFor="admin-product-search" className="sr-only">
              Search products
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              id="admin-product-search"
              type="search"
              className="field pl-10"
              placeholder="Search name, SKU or bike model"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="admin-product-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="admin-product-category"
              className="field w-auto"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-5">
        {loading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No products match this search.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="py-2 pr-3 font-medium">Product</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Category</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Price</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Stock</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Featured</th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <ProductImage src={product.image} fallback={product.fallbackImage} alt="" className="size-10 shrink-0 rounded-lg bg-ink-50 object-cover" />
                        <div className="min-w-0">
                          <Link to={`/admin/products/${product.id}`} className="block truncate font-medium text-ink-900 hover:text-brand-600">
                            {product.name}
                          </Link>
                          <span className="text-xs text-ink-500">{product.sku}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-ink-600">
                      {categories.find((c) => c.slug === product.category)?.name ?? product.category}
                    </td>
                    <td className="py-3 pr-3 font-medium text-ink-900">{formatPKR(product.price)}</td>
                    <td className="py-3 pr-3">
                      <label className="sr-only" htmlFor={`stock-${product.id}`}>
                        Stock quantity for {product.name}
                      </label>
                      <input
                        id={`stock-${product.id}`}
                        type="number"
                        min={0}
                        className="field h-10 w-24 py-1"
                        value={product.stockQuantity}
                        onChange={(event) =>
                          updateProduct(product.id, { stockQuantity: Math.max(0, Number(event.target.value) || 0) })
                        }
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <label className="inline-flex items-center gap-2 text-xs text-ink-600">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
                          checked={product.featured}
                          onChange={(event) => updateProduct(product.id, { featured: event.target.checked })}
                        />
                        Featured
                      </label>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/products/${product.id}`}
                          className="btn-ghost px-2"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Link>
                        {pendingDelete === product.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              className="btn-primary h-9 px-3 py-1 text-xs"
                              onClick={() => {
                                deleteProduct(product.id);
                                setPendingDelete(null);
                              }}
                            >
                              Confirm
                            </button>
                            <button type="button" className="btn-ghost h-9 px-2 text-xs" onClick={() => setPendingDelete(null)}>
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost px-2 text-ink-500 hover:text-brand-600"
                            onClick={() => setPendingDelete(product.id)}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
