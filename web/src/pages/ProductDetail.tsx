import { Check, MessageCircle, PackageX, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SectionHeading } from '../components/home/SectionHeading';
import { ProductGrid } from '../components/product/ProductGrid';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { ProductDetailSkeleton } from '../components/ui/Skeletons';
import { StockBadge } from '../components/ui/StockBadge';
import { siteConfig } from '../config/site';
import { categoryBySlug } from '../data/categories';
import { bikes } from '../data/bikes';
import { discountPercent, formatPKR } from '../lib/format';
import { useSeo } from '../lib/seo';
import { productInquiryLink, stockInquiryLink } from '../lib/whatsapp';
import { useCart } from '../store/CartContext';
import { useCatalog } from '../store/CatalogContext';
import { ProductImage } from '../components/product/ProductImage';

const ProductDetail = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { products, loading, getProductBySlug } = useCatalog();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const product = getProductBySlug(slug);

  const related = useMemo(
    () =>
      product
        ? products
            .filter(
              (item) =>
                item.id !== product.id &&
                (item.category === product.category ||
                  item.compatibleBikes.some((bike) => product.compatibleBikes.includes(bike))),
            )
            .slice(0, 4)
        : [],
    [products, product],
  );

  useSeo({
    title: product ? `${product.name} | ${siteConfig.name}` : `Product not found | ${siteConfig.name}`,
    description: product
      ? `${product.shortDescription} Price ${formatPKR(product.price)}. Fits ${product.compatibleBikes.join(', ')}. SKU ${product.sku}.`
      : 'The product you are looking for is not available.',
    jsonLd: product
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          image: product.image,
          description: product.description,
          sku: product.sku,
          brand: { '@type': 'Brand', name: product.brand },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'PKR',
            price: product.price,
            availability: product.stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: siteConfig.name },
          },
        }
      : undefined,
  });

  if (loading) {
    return (
      <div className="container-page py-10">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={PackageX}
          tone="error"
          as="h1"
          title="Product not found"
          description="This product may have been removed or the link is incorrect. Browse the shop or search for the part you need."
          action={
            <>
              <Link to="/shop" className="btn-primary">
                Go to shop
              </Link>
              <Link to="/" className="btn-outline">
                Back to home
              </Link>
            </>
          }
        />
      </div>
    );
  }

  const category = categoryBySlug[product.category];
  const discount = discountPercent(product.price, product.oldPrice);

  const handleAdd = () => {
    addItem(product.id, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="container-page">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Shop', to: '/shop' },
          { label: category?.name ?? 'Parts', to: `/category/${product.category}` },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-ink-50">
            <ProductImage
              src={product.images[0] ?? product.image}
              fallback={product.fallbackImage}
              alt={product.name}
              width={1200}
              height={900}
              priority
              className="aspect-4/3 w-full object-cover"
            />
            {discount !== null && <span className="badge absolute left-4 top-4 bg-brand-600 text-white">{discount}% off</span>}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-ink-600">
            <div className="card flex items-center gap-2 p-3">
              <Truck className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
              Cash on delivery
            </div>
            <div className="card flex items-center gap-2 p-3">
              <ShieldCheck className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
              Checked before dispatch
            </div>
            <div className="card flex items-center gap-2 p-3">
              <MessageCircle className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
              Fitment help on WhatsApp
            </div>
          </div>
        </div>

        <div>
          <Link
            to={`/category/${product.category}`}
            className="text-xs font-semibold uppercase tracking-wide text-brand-600 hover:underline"
          >
            {category?.name ?? product.category}
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-ink-900">{formatPKR(product.price)}</span>
            {product.oldPrice && <span className="text-base text-ink-400 line-through">{formatPKR(product.oldPrice)}</span>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StockBadge stock={product.stock} quantity={product.stockQuantity} />
            <span className="badge bg-ink-100 text-ink-600">SKU: {product.sku}</span>
            <span className="badge bg-ink-100 text-ink-600">Brand: {product.brand}</span>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-ink-600">{product.description}</p>

          <div className="mt-6 rounded-xl border border-ink-200 p-4">
            <h2 className="text-sm font-semibold text-ink-900">Compatible motorcycles</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {product.compatibleBikes.map((bike) => {
                const match = bikes.find((item) => item.name === bike);
                return (
                  <li key={bike}>
                    {match ? (
                      <Link to={`/bike/${match.slug}`} className="badge bg-ink-100 text-ink-700 hover:bg-ink-200">
                        {bike}
                      </Link>
                    ) : (
                      <span className="badge bg-ink-100 text-ink-700">{bike}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-ink-500">
              Not sure if this fits your bike? Send us the model on WhatsApp and we will confirm before you order.
            </p>
          </div>

          {product.stock ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(product.stockQuantity, 1)} />
              <button type="button" onClick={handleAdd} className={added ? 'btn-dark flex-1' : 'btn-primary flex-1'}>
                {added ? (
                  <>
                    <Check className="size-4" aria-hidden="true" /> Added to cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="size-4" aria-hidden="true" /> Add to Cart
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-dark flex-1"
                onClick={() => {
                  addItem(product.id, quantity);
                  navigate('/checkout');
                }}
              >
                Buy Now
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-ink-200 bg-ink-50 p-4">
              <p className="text-sm font-medium text-ink-800">This part is currently out of stock.</p>
              <p className="mt-1 text-sm text-ink-500">
                Message us on WhatsApp and we will tell you when it is back or suggest an alternative that fits your bike.
              </p>
              <a
                href={stockInquiryLink(product)}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-whatsapp mt-4 w-full sm:w-auto"
              >
                <MessageCircle className="size-4" aria-hidden="true" /> Ask about availability
              </a>
            </div>
          )}

          <a
            href={productInquiryLink(product)}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-whatsapp mt-3 w-full"
          >
            <MessageCircle className="size-4" aria-hidden="true" /> Ask about this product on WhatsApp
          </a>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-ink-900">Specifications</h2>
            <dl className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-200">
              {product.specifications.map((spec) => (
                <div key={spec.label} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-ink-500">{spec.label}</dt>
                  <dd className="text-right font-medium text-ink-900">{spec.value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-ink-500">Part category</dt>
                <dd className="text-right font-medium text-ink-900">{category?.name ?? product.category}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-ink-500">SKU</dt>
                <dd className="text-right font-medium text-ink-900">{product.sku}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="py-14">
          <SectionHeading title="Related parts" description="Other items that fit the same bikes or job." />
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
