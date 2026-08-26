import { editorialSplit } from '@/data/editorial'
import { SmartImage } from '@/components/ui/SmartImage'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'

export function EditorialSplit() {
  return (
    <section className="bg-cream">
      <div className="grid items-stretch lg:grid-cols-2">
        <Reveal animation="image-reveal" className="h-full">
          <SmartImage
            image={editorialSplit.image}
            ratio="aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[640px]"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </Reveal>
        <Reveal className="flex items-center px-6 py-16 sm:px-12 lg:px-20 lg:py-24">
          <div className="max-w-md">
            <p className="eyebrow">{editorialSplit.eyebrow}</p>
            <h2 className="mt-4 text-3xl leading-tight text-balance sm:text-4xl lg:text-[44px]">
              {editorialSplit.headline}
            </h2>
            <div className="mt-6 h-px w-16 bg-champagne-400" />
            <p className="mt-6 text-[15px] leading-relaxed text-stoneish">{editorialSplit.body}</p>
            <ButtonLink to={editorialSplit.cta.href} size="lg" className="mt-9">
              {editorialSplit.cta.label}
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
