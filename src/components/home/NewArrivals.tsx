import { Link } from 'react-router-dom'
import { newArrivalProducts, products } from '@/data/products'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ProductGrid } from '@/components/ui/ProductGrid'

export function NewArrivals() {
  const items = (newArrivalProducts.length >= 8 ? newArrivalProducts : products).slice(0, 8)

  return (
    <section className="container-lux py-20 sm:py-28">
      <SectionHeading
        eyebrow="Just In"
        title="New Arrivals"
        description="The newest additions to the Swabi Jewellers collection — demo pieces, structured to be replaced with real inventory."
        action={
          <Link to="/shop/new-arrivals" className="btn-secondary">
            View All New Arrivals
          </Link>
        }
      />
      <div className="mt-12">
        <ProductGrid products={items} />
      </div>
    </section>
  )
}
