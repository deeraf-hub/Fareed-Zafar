import { heroSlide } from '@/data/editorial'
import { ButtonLink } from '@/components/ui/Button'
import { SmartImage } from '@/components/ui/SmartImage'
import { resolveImage } from '@/lib/imagery'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="relative min-h-[88svh] w-full lg:min-h-[92svh]">
        {/* A portrait crop is served to phones so the model is not cut off by the wide frame. */}
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet={resolveImage(heroSlide.image, { width: 900, height: 1300 })}
          />
          <img
            src={resolveImage(heroSlide.image, { width: 1900, height: 1150 })}
            alt={heroSlide.image.alt}
            width={1900}
            height={1150}
            fetchPriority="high"
            decoding="sync"
            className="absolute inset-0 h-full w-full animate-image-reveal object-cover object-center"
          />
        </picture>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ivory via-ivory/85 to-ivory/10 lg:from-ivory/95 lg:via-ivory/60 lg:to-transparent"
        />

        <div className="container-luxe relative flex min-h-[88svh] items-center lg:min-h-[92svh]">
          <div className="max-w-xl py-20">
            <p className="animate-fade-up eyebrow" style={{ animationDelay: '120ms' }}>
              {heroSlide.eyebrow}
            </p>
            <h1
              className="mt-5 animate-fade-up font-display text-[38px] leading-[1.08] text-balance sm:text-5xl lg:text-[62px]"
              style={{ animationDelay: '240ms' }}
            >
              {heroSlide.headline}
            </h1>
            <p
              className="mt-6 max-w-md animate-fade-up text-base leading-relaxed text-stoneish"
              style={{ animationDelay: '380ms' }}
            >
              {heroSlide.subheadline}
            </p>
            <div
              className="mt-9 flex animate-fade-up flex-wrap gap-3"
              style={{ animationDelay: '520ms' }}
            >
              <ButtonLink to={heroSlide.primaryCta.href} size="lg">
                {heroSlide.primaryCta.label}
              </ButtonLink>
              <ButtonLink to={heroSlide.secondaryCta.href} variant="outline" size="lg">
                {heroSlide.secondaryCta.label}
              </ButtonLink>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-10 right-10 hidden w-52 animate-fade-up border border-ivory/70 shadow-lift xl:block"
          style={{ animationDelay: '700ms' }}
        >
          <SmartImage image={heroSlide.secondaryImage} ratio="aspect-[3/4]" priority />
        </div>
      </div>
    </section>
  )
}
