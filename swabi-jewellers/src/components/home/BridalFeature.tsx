import { bridalFeature } from '@/data/editorial'
import { SmartImage } from '@/components/ui/SmartImage'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { CheckIcon } from '@/components/ui/icons'

export function BridalFeature() {
  return (
    <section className="bg-navy-700 text-ivory">
      <div className="grid items-stretch lg:grid-cols-[1.1fr_1fr]">
        <Reveal className="flex items-center px-6 py-16 sm:px-12 lg:px-20 lg:py-28">
          <div className="max-w-lg">
            <p className="text-[11px] uppercase tracking-luxe text-champagne-300">
              {bridalFeature.eyebrow}
            </p>
            <h2 className="mt-4 font-display text-3xl leading-tight text-ivory text-balance sm:text-4xl lg:text-[46px]">
              {bridalFeature.headline}
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-ivory/75">{bridalFeature.body}</p>
            <ul className="mt-8 space-y-3">
              {bridalFeature.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-ivory/80">
                  <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-champagne-300" />
                  {point}
                </li>
              ))}
            </ul>
            <ButtonLink to={bridalFeature.cta.href} variant="dark" size="lg" className="mt-10">
              {bridalFeature.cta.label}
            </ButtonLink>
          </div>
        </Reveal>
        <Reveal animation="image-reveal" className="h-full">
          <SmartImage
            image={bridalFeature.image}
            ratio="aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[680px]"
            sizes="(min-width: 1024px) 45vw, 100vw"
          />
        </Reveal>
      </div>
    </section>
  )
}
