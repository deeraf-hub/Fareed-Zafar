import { Link } from 'react-router-dom'
import { bestSellerProducts } from '@/data/products'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ProductGrid } from '@/components/ui/ProductGrid'

export function BestSellers() {
  const items = bestSellerProducts.slice(0, 8)

  return (
    <section className="bg-cream/60 py-20 sm:py-28">
      <div className="container-lux">
        <SectionHeading
          eyebrow="Customer Favourites"
          title="Our Most Loved Pieces"
          description="The pieces our customers reach for again and again."
          action={
            <Link to="/shop?sort=best-selling" className="btn-secondary">
              Shop Best Sellers
            </Link>
          }
        />
        <div className="mt-12">
          <ProductGrid products={items} />
        </div>
      </div>
    </section>
  )
}
