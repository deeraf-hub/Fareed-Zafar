import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ShoppingCart, Truck } from 'lucide-react'
import { getProductById, getRelatedProducts } from '../data/products.js'
import { getProductImage } from '../data/images.js'
import { CATEGORY_MAP } from '../data/categories.js'
import { formatPKR } from '../lib/format.js'
import { useCart } from '../context/CartContext.jsx'
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx'
import Rating from '../components/common/Rating.jsx'
import Badge from '../components/common/Badge.jsx'
import QuantitySelector from '../components/common/QuantitySelector.jsx'
import ProductGrid from '../components/shop/ProductGrid.jsx'

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)

  const product = getProductById(id)

  useEffect(() => {
    if (product) {
      document.title = `${product.name} | Hand Tools Trading Corporation`
      setQuantity(1)
    }
  }, [product])

  if (!product) return <Navigate to="/product-not-found" replace />

  const category = CATEGORY_MAP[product.category]
  const related = getRelatedProducts(product, 4)

  const handleBuyNow = () => {
    addItem(product, quantity)
    navigate('/checkout')
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Shop', to: '/shop' },
          { label: category?.name, to: `/shop?category=${category?.id}` },
          { label: product.name },
        ]}
      />

      <div className="container-app py-8 md:py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-white shadow-sm">
            <Badge label={product.badge} />
            <img
              src={getProductImage(product, 900)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-accent-600">
              {category?.name}
            </span>
            <h1 className="mt-2 font-heading text-2xl font-bold text-navy-900 md:text-3xl">
              {product.name}
            </h1>
            <div className="mt-3">
              <Rating value={product.rating} count={product.reviewCount} size={16} />
            </div>
            <p className="mt-5 font-heading text-3xl font-bold text-navy-900">
              {formatPKR(product.price)}
            </p>

            <p className="mt-5 text-sm leading-relaxed text-steel-600 md:text-base">
              {product.description}
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 size={18} />
              {product.availability}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <QuantitySelector value={quantity} onChange={setQuantity} />
              <button
                type="button"
                onClick={() => addItem(product, quantity)}
                className="flex items-center gap-2 rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
              >
                <ShoppingCart size={17} />
                Add to Cart
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="rounded-md border border-navy-800 px-6 py-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-800 hover:text-white"
              >
                Buy / Order Now
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-steel-500">
              <Truck size={16} className="text-steel-400" />
              Cash on Delivery, JazzCash &amp; EasyPaisa accepted at checkout.
            </div>

            <div className="mt-8 rounded-lg border border-steel-100 bg-white p-5">
              <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-navy-900">
                Key Specifications
              </h2>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {product.specs.map((spec) => (
                  <div key={spec.label} className="flex justify-between border-b border-steel-100 py-1.5 text-sm sm:justify-start sm:gap-2">
                    <dt className="text-steel-500">{spec.label}</dt>
                    <dd className="font-medium text-navy-900">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 font-heading text-2xl font-bold text-navy-900">Related Products</h2>
            <ProductGrid products={related} />
          </div>
        )}

        <div className="mt-10 text-sm text-steel-500">
          <Link to="/shop" className="font-medium text-accent-600 hover:underline">
            ← Back to Shop
          </Link>
        </div>
      </div>
    </>
  )
}
