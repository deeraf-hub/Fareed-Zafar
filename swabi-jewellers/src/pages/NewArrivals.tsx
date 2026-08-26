import { newArrivals } from '@/data/products'
import { getCategory } from '@/data/categories'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ModelStories } from '@/components/home/ModelStory'

export default function NewArrivals() {
  const category = getCategory('new-arrivals')

  return (
    <>
      <Seo
        title="New Arrivals"
        description="The newest imitation jewellery to join the Swabi Jewellers collection — plated chains, pearl sets, kundan-style bridal pieces and more."
      />
      <PageHeader
        eyebrow="Just in"
        title="New Arrivals"
        description="The newest pieces to leave the workshop. Restocked weekly — saved pieces sell quickly."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'New Arrivals' }]}
      />

      {category && (
        <div className="container-luxe pt-12">
          <SmartImage
            image={category.image}
            ratio="aspect-[16/9] sm:aspect-[21/9]"
            priority
            sizes="100vw"
            width={1800}
            height={800}
          />
        </div>
      )}

      <div className="container-luxe py-12 lg:py-16">
        <ProductGrid products={newArrivals} showRating prioritiseFirst />
      </div>

      <ModelStories ids={['story-everyday']} />
    </>
  )
}
