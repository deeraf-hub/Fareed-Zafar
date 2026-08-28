import { Link } from 'react-router-dom'
import { categories } from '@/data/categories'
import { PlaceholderArt } from '@/lib/placeholderArt'
import { Reveal } from '@/components/ui/Reveal'
import { useSeo } from '@/lib/useSeo'
import { siteConfig } from '@/config/site'

export function Collections() {
  useSeo('Collections', `Explore every jewellery collection from ${siteConfig.brandName} — necklaces, earrings, bridal and more.`)

  return (
    <div className="container-lux py-14 sm:py-20">
      <div className="mb-12 max-w-xl">
        <span className="eyebrow">Curated For You</span>
        <h1 className="mt-3 text-3xl text-charcoal sm:text-4xl">All Collections</h1>
        <p className="mt-4 text-charcoal-muted">
          From everyday essentials to bridal statement pieces — explore every Swabi Jewellers collection.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, i) => (
          <Reveal key={category.slug} delay={i * 60}>
            <Link to={`/collections/${category.slug}`} className="group relative block aspect-[4/5] overflow-hidden">
              <PlaceholderArt scene={category.scene} className="h-full w-full transition-transform duration-700 ease-luxe group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h2 className="font-display text-2xl text-ivory">{category.name}</h2>
                <p className="mt-1 text-sm text-ivory/75">{category.description}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
