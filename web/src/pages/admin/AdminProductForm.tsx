import { ArrowLeft, CircleAlert, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductImage } from '../../components/product/ProductImage';
import { siteConfig } from '../../config/site';
import { bikes } from '../../data/bikes';
import { useSeo } from '../../lib/seo';
import { useCatalog } from '../../store/CatalogContext';
import type { CategorySlug, ProductSpecification } from '../../types';

/** Local illustrations, used as the fallback when a photo cannot be loaded. */
const fallbackOptions = [
  'spark-plug', 'air-filter', 'oil-filter', 'clutch-plate', 'cable', 'piston-ring', 'gasket', 'carburetor',
  'valve-set', 'engine-oil', 'battery', 'bulb', 'indicator', 'horn', 'ignition-coil', 'cdi-unit', 'rectifier',
  'wiring-set', 'brake-switch', 'brake-shoe', 'fork-seal', 'shock-absorber', 'lever', 'mirror', 'handle-grip',
  'kick-starter', 'gear-lever', 'foot-rest', 'chain-set', 'sprocket', 'chain-adjuster', 'lock', 'bike-cover',
  'mobile-holder', 'led-light', 'reflector', 'number-plate-frame', 'headlight', 'tail-light', 'mudguard', 'speedometer',
].map((name) => `/products/${name}.svg`);

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, categories, createProduct, updateProduct } = useCatalog();

  const existing = useMemo(() => products.find((product) => product.id === id), [products, id]);
  const isEdit = Boolean(existing);

  const [form, setForm] = useState({
    name: existing?.name ?? '',
    sku: existing?.sku ?? '',
    category: (existing?.category ?? 'engine-parts') as CategorySlug,
    price: existing?.price?.toString() ?? '',
    oldPrice: existing?.oldPrice?.toString() ?? '',
    brand: existing?.brand ?? 'Qalandari Select',
    image: existing?.image ?? '',
    fallbackImage: existing?.fallbackImage ?? fallbackOptions[0],
    stockQuantity: existing?.stockQuantity?.toString() ?? '0',
    shortDescription: existing?.shortDescription ?? '',
    description: existing?.description ?? '',
    compatibleBikes: existing?.compatibleBikes ?? ([] as string[]),
    specifications: existing?.specifications ?? ([{ label: '', value: '' }] as ProductSpecification[]),
    featured: existing?.featured ?? false,
    popular: existing?.popular ?? false,
  });
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: `${isEdit ? 'Edit' : 'Add'} product | Admin | ${siteConfig.name}`,
    description: 'Manage a product.',
    noindex: true,
  });

  if (id && id !== 'new' && !existing) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-600">This product no longer exists.</p>
        <Link to="/admin/products" className="btn-primary mt-4">
          Back to products
        </Link>
      </div>
    );
  }

  const toggleBike = (bikeName: string) =>
    setForm((current) => ({
      ...current,
      compatibleBikes: current.compatibleBikes.includes(bikeName)
        ? current.compatibleBikes.filter((item) => item !== bikeName)
        : [...current.compatibleBikes, bikeName],
    }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);

    if (form.name.trim().length < 3) return setError('Enter a product name.');
    if (!form.sku.trim()) return setError('Enter a SKU, for example QAS-ENG-013.');
    if (!Number.isFinite(price) || price <= 0) return setError('Enter a valid price in PKR.');
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) return setError('Enter a valid stock quantity.');
    if (form.compatibleBikes.length === 0) return setError('Select at least one compatible motorcycle.');
    if (form.shortDescription.trim().length < 10) return setError('Add a short description for the product card.');

    const specifications = form.specifications.filter((spec) => spec.label.trim() && spec.value.trim());
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category,
      price,
      oldPrice: form.oldPrice.trim() ? Number(form.oldPrice) : null,
      brand: form.brand.trim(),
      image: form.image,
      fallbackImage: form.fallbackImage,
      stockQuantity,
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim() || form.shortDescription.trim(),
      compatibleBikes: form.compatibleBikes,
      specifications,
      featured: form.featured,
      popular: form.popular,
    };

    if (existing) {
      updateProduct(existing.id, { ...payload, stock: stockQuantity > 0 });
    } else {
      createProduct(payload);
    }
    navigate('/admin/products');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">{isEdit ? 'Edit product' : 'Add product'}</h1>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-ink-900">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="product-name" className="field-label">Product name</label>
              <input
                id="product-name"
                className="field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Honda CG 125 Clutch Cable"
              />
            </div>
            <div>
              <label htmlFor="product-sku" className="field-label">SKU</label>
              <input
                id="product-sku"
                className="field"
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
                placeholder="QAS-CTL-008"
              />
            </div>
            <div>
              <label htmlFor="product-category" className="field-label">Category</label>
              <select
                id="product-category"
                className="field"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value as CategorySlug })}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="product-price" className="field-label">Price (PKR)</label>
              <input
                id="product-price"
                type="number"
                min={0}
                className="field"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="product-old-price" className="field-label">
                Old price (PKR) <span className="text-ink-400">optional</span>
              </label>
              <input
                id="product-old-price"
                type="number"
                min={0}
                className="field"
                value={form.oldPrice}
                onChange={(event) => setForm({ ...form, oldPrice: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="product-stock" className="field-label">Stock quantity</label>
              <input
                id="product-stock"
                type="number"
                min={0}
                className="field"
                value={form.stockQuantity}
                onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="product-brand" className="field-label">Brand</label>
              <input
                id="product-brand"
                className="field"
                value={form.brand}
                onChange={(event) => setForm({ ...form, brand: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
                checked={form.featured}
                onChange={(event) => setForm({ ...form, featured: event.target.checked })}
              />
              Show in Featured Products
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
                checked={form.popular}
                onChange={(event) => setForm({ ...form, popular: event.target.checked })}
              />
              Show in Best Sellers
            </label>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-ink-900">Product image</h2>
          <p className="text-xs text-ink-500">
            Paste the URL of the product photograph. The fallback illustration is shown only if the photo cannot be
            loaded, so a product never renders a broken image.
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <ProductImage
              src={form.image}
              fallback={form.fallbackImage}
              alt=""
              className="size-24 rounded-lg border border-ink-200 bg-ink-50 object-cover"
            />
            <div className="min-w-56 flex-1 space-y-4">
              <div>
                <label htmlFor="product-image" className="field-label">
                  Photo URL
                </label>
                <input
                  id="product-image"
                  className="field"
                  placeholder="https://…"
                  value={form.image}
                  onChange={(event) => setForm({ ...form, image: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor="product-fallback" className="field-label">
                  Fallback illustration
                </label>
                <select
                  id="product-fallback"
                  className="field"
                  value={form.fallbackImage}
                  onChange={(event) => setForm({ ...form, fallbackImage: event.target.value })}
                >
                  {fallbackOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replace('/products/', '').replace('.svg', '').replace(/-/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-ink-900">Compatible motorcycles</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bikes.map((bike) => (
              <label key={bike.id} className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600"
                  checked={form.compatibleBikes.includes(bike.name)}
                  onChange={() => toggleBike(bike.name)}
                />
                {bike.name}
              </label>
            ))}
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-ink-900">Description</h2>
          <div>
            <label htmlFor="product-short" className="field-label">Short description (product card)</label>
            <textarea
              id="product-short"
              rows={2}
              className="field"
              value={form.shortDescription}
              onChange={(event) => setForm({ ...form, shortDescription: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="product-description" className="field-label">Full description (product page)</label>
            <textarea
              id="product-description"
              rows={5}
              className="field"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-ink-900">Specifications</h2>
          {form.specifications.map((spec, index) => (
            <div key={index} className="flex flex-wrap gap-3">
              <div className="min-w-40 flex-1">
                <label htmlFor={`spec-label-${index}`} className="sr-only">Specification label</label>
                <input
                  id={`spec-label-${index}`}
                  className="field"
                  placeholder="Label, e.g. Thread size"
                  value={spec.label}
                  onChange={(event) => {
                    const next = [...form.specifications];
                    next[index] = { ...next[index], label: event.target.value };
                    setForm({ ...form, specifications: next });
                  }}
                />
              </div>
              <div className="min-w-40 flex-1">
                <label htmlFor={`spec-value-${index}`} className="sr-only">Specification value</label>
                <input
                  id={`spec-value-${index}`}
                  className="field"
                  placeholder="Value, e.g. 10 mm"
                  value={spec.value}
                  onChange={(event) => {
                    const next = [...form.specifications];
                    next[index] = { ...next[index], value: event.target.value };
                    setForm({ ...form, specifications: next });
                  }}
                />
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={() =>
                  setForm({ ...form, specifications: form.specifications.filter((_, i) => i !== index) })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-outline"
            onClick={() => setForm({ ...form, specifications: [...form.specifications, { label: '', value: '' }] })}
          >
            Add specification
          </button>
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary">
            <Save className="size-4" aria-hidden="true" /> {isEdit ? 'Save changes' : 'Create product'}
          </button>
          <Link to="/admin/products" className="btn-outline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
