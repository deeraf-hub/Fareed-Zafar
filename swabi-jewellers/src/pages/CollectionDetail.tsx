import { useParams } from 'react-router-dom'
import { collections, products, slugify } from '@/data/products'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProductGrid } from '@/components/product/ProductGrid'
import { formatPrice } from '@/lib/format'
import NotFound from './NotFound'

export default function CollectionDetail() {
  const { slug } = useParams()
  const collection = collections.find((entry) => slugify(entry) === slug)

  if (!collection) return <NotFound />

  const items = products.filter((product) => product.collection === collection)
  const from = Math.min(...items.map((product) => product.price))

  return (
    <>
      <Seo
        title={`${collection} Collection`}
        description={`The ${collection} collection at Swabi Jewellers — ${items.length} pieces from ${formatPrice(from)}.`}
      />
      <PageHeader
        eyebrow="Collection"
        title={collection}
        description={`${items.length} pieces in this collection, from ${formatPrice(from)}.`}
        crumbs={[
          { label: 'Home', to: '/' },
          { label: 'Collections', to: '/collections' },
          { label: collection },
        ]}
      />

      <div className="container-luxe py-12 lg:py-16">
        <ProductGrid products={items} showRating prioritiseFirst />
      </div>
    </>
  )
}
