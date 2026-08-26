import { Link } from 'react-router-dom'
import { collections, products } from '@/data/products'
import { slugify } from '@/data/products'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { Reveal } from '@/components/ui/Reveal'
import { formatPrice } from '@/lib/format'

const COLLECTION_NOTES: Record<string, string> = {
  'Bridal Couture': 'Complete kundan-style suites for nikkah, mehndi and walima.',
  'Everyday Luxe': 'Fine plated chains, hoops and slim bands for daily wear.',
  Meher: 'Contemporary stone-set pieces with a soft, modern line.',
  Noor: 'Gold-plated and meenakari pieces with a traditional accent.',
  'Pearl Atelier': 'Shell pearls, knotted and set by hand.',
  Roshan: 'American diamond brilliance — studs, solitaires and tennis lines.',
  'Swabi Heritage': 'Hand-engraved and temple-work pieces made the traditional way.',
  Zarina: 'Weighted chain-work bracelets and necklaces.',
}

export default function Collections() {
  return (
    <>
      <Seo
        title="Collections"
        description="Eight Swabi Jewellers collections — Bridal Couture, Pearl Atelier, Everyday Luxe, Swabi Heritage and more."
      />
      <PageHeader
        eyebrow="Explore"
        title="Our Collections"
        description="Each collection is built around a single idea — a material, an occasion, or a way of making."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Collections' }]}
      />

      <div className="container-luxe py-12 lg:py-16">
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
          {collections.map((collection, index) => {
            const items = products.filter((product) => product.collection === collection)
            const from = Math.min(...items.map((product) => product.price))
            return (
              <Reveal key={collection} delay={Math.min(index, 7) * 70}>
                <Link to={`/collections/${slugify(collection)}`} className="group block">
                  <div className="overflow-hidden bg-cream">
                    <SmartImage
                      image={items[0]?.images[2] ?? items[0]?.images[0]}
                      ratio="aspect-[3/4]"
                      className="card-hover-media"
                      sizes="(min-width: 1024px) 25vw, 50vw"
                    />
                  </div>
                  <h2 className="mt-4 font-display text-xl">
                    <span className="link-underline">{collection}</span>
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-stoneish">
                    {COLLECTION_NOTES[collection] ?? `${items.length} pieces in this collection.`}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-wideish text-champagne-600">
                    {items.length} pieces · from {formatPrice(from)}
                  </p>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </>
  )
}
