import { products } from '@/data/products'
import { bridalFeature } from '@/data/editorial'
import { siteConfig } from '@/config/site'
import { Seo } from '@/components/Seo'
import { SmartImage } from '@/components/ui/SmartImage'
import { ProductGrid } from '@/components/product/ProductGrid'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Testimonials } from '@/components/home/Testimonials'
import { formatPrice } from '@/lib/format'

export default function Bridal() {
  const bridalPieces = products.filter(
    (product) => product.category === 'bridal-jewellery' || product.collection === 'Bridal Couture',
  )
  const from = Math.min(...bridalPieces.map((product) => product.price))

  return (
    <>
      <Seo
        title="Bridal Collection"
        description={`Complete kundan-style bridal sets, rani haars, jhumkas, matha patti and kangan from ${formatPrice(from)} — ready to ship across Pakistan.`}
      />

      <section className="relative overflow-hidden bg-cream">
        <div className="grid lg:grid-cols-2">
          <div className="flex items-center px-6 py-16 sm:px-12 lg:px-16 lg:py-24">
            <div className="max-w-lg">
              <Breadcrumbs
                items={[{ label: 'Home', to: '/' }, { label: 'Bridal' }]}
                className="mb-8"
              />
              <p className="eyebrow">{bridalFeature.eyebrow}</p>
              <h1 className="mt-4 animate-fade-up font-display text-4xl leading-tight text-balance lg:text-[52px]">
                {bridalFeature.headline}
              </h1>
              <p className="mt-6 animate-fade-up text-[15px] leading-relaxed text-stoneish">
                {bridalFeature.body}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <ButtonLink to="/shop/bridal-jewellery" size="lg">
                  Shop Bridal
                </ButtonLink>
                <ButtonLink to="/contact" variant="outline" size="lg">
                  Book a Consultation
                </ButtonLink>
              </div>
              <p className="mt-6 text-xs text-stoneish">
                Complete sets from {formatPrice(from)} · Visit us at {siteConfig.contact.city} or call{' '}
                <a href={siteConfig.contact.phoneHref} className="link-underline text-navy-700">
                  {siteConfig.contact.phone}
                </a>
              </p>
            </div>
          </div>
          <Reveal animation="image-reveal" className="h-full">
            <SmartImage
              image={bridalFeature.image}
              ratio="aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[700px]"
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      <section className="container-luxe py-20 lg:py-24">
        <SectionHeading
          eyebrow="The suite"
          title="Everything the Bride Needs"
          description="Rani haar, choker, jhumkas, matha patti, nath and kangan — buy the complete set, or build it piece by piece."
        />
        <ProductGrid products={bridalPieces} showRating className="mt-12 lg:mt-16" />
      </section>

      <Testimonials />
    </>
  )
}
