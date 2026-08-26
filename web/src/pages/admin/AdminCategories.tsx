import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { siteConfig } from '../../config/site';
import { useSeo } from '../../lib/seo';
import { useCatalog } from '../../store/CatalogContext';
import { ProductImage } from '../../components/product/ProductImage';

const AdminCategories = () => {
  const { categories, products, createCategory, updateCategory, deleteCategory } = useCatalog();
  const [form, setForm] = useState({ name: '', description: '', image: '/products/spark-plug.svg' });
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useSeo({ title: `Categories | Admin | ${siteConfig.name}`, description: 'Manage categories.', noindex: true });

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 3) {
      setError('Enter a category name.');
      return;
    }
    createCategory({ name: form.name.trim(), description: form.description.trim(), image: form.image });
    setForm({ name: '', description: '', image: '/products/spark-plug.svg' });
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Categories</h1>
        <p className="mt-1 text-sm text-ink-500">{categories.length} categories in the storefront navigation.</p>
      </div>

      <form onSubmit={handleCreate} className="card space-y-4 p-5">
        <h2 className="text-base font-semibold text-ink-900">Add a category</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category-name" className="field-label">Name</label>
            <input
              id="category-name"
              className="field"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Tyres and Tubes"
            />
          </div>
          <div>
            <label htmlFor="category-image" className="field-label">Image path</label>
            <input
              id="category-image"
              className="field"
              value={form.image}
              onChange={(event) => setForm({ ...form, image: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="category-description" className="field-label">Description</label>
            <textarea
              id="category-description"
              rows={2}
              className="field"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Shown on the category page and in listings."
            />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-brand-700">{error}</p>}
        <button type="submit" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" /> Add category
        </button>
      </form>

      <div className="space-y-4">
        {categories.map((category) => {
          const count = products.filter((product) => product.category === category.slug).length;
          return (
            <div key={category.id} className="card p-5">
              <div className="flex flex-wrap items-start gap-4">
                <ProductImage src={category.image} fallback={category.fallbackImage} alt="" className="size-16 rounded-lg bg-ink-50 object-cover" />
                <div className="min-w-56 flex-1 space-y-3">
                  <div>
                    <label htmlFor={`cat-name-${category.id}`} className="field-label">Name</label>
                    <input
                      id={`cat-name-${category.id}`}
                      className="field"
                      value={category.name}
                      onChange={(event) => updateCategory(category.id, { name: event.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`cat-desc-${category.id}`} className="field-label">Description</label>
                    <textarea
                      id={`cat-desc-${category.id}`}
                      rows={2}
                      className="field"
                      value={category.description}
                      onChange={(event) => updateCategory(category.id, { description: event.target.value })}
                    />
                  </div>
                  <p className="text-xs text-ink-500">
                    URL: <code className="font-mono">/category/{category.slug}</code> &middot; {count}{' '}
                    {count === 1 ? 'product' : 'products'}
                  </p>
                </div>
                <div>
                  {pendingDelete === category.id ? (
                    <div className="flex flex-col gap-2">
                      <p className="max-w-48 text-xs text-ink-500">
                        {count > 0
                          ? `${count} products use this category and will keep their current category slug.`
                          : 'This category has no products.'}
                      </p>
                      <button
                        type="button"
                        className="btn-primary h-10 px-3 text-xs"
                        onClick={() => {
                          deleteCategory(category.id);
                          setPendingDelete(null);
                        }}
                      >
                        Confirm delete
                      </button>
                      <button type="button" className="btn-ghost h-10 px-3 text-xs" onClick={() => setPendingDelete(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setPendingDelete(category.id)}
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCategories;
