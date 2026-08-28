import { Link } from 'react-router-dom'
import { PlaceholderArt } from '@/lib/placeholderArt'
import { siteConfig } from '@/config/site'

export function Hero() {
  return (
    <section className="relative h-[86vh] min-h-[560px] w-full overflow-hidden">
      <PlaceholderArt
        scene="hero"
        tone="beige"
        className="absolute inset-0 h-full w-full animate-fadeIn"
        showCaption
        caption="Editorial Campaign — The Aura Collection"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-charcoal/5 to-transparent" />

      <div className="container-lux relative flex h-full flex-col items-start justify-end pb-20 sm:pb-28">
        <span className="eyebrow mb-4 text-ivory/90 animate-fadeUp [animation-delay:0.1s] opacity-0">
          Swabi Jewellers
        </span>
        <h1 className="max-w-2xl text-4xl leading-[1.1] text-ivory sm:text-6xl lg:text-[4.2rem] animate-fadeUp [animation-delay:0.25s] opacity-0">
          {siteConfig.tagline}
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-ivory/85 sm:text-lg animate-fadeUp [animation-delay:0.4s] opacity-0">
          {siteConfig.supportingText}
        </p>
        <div className="mt-8 flex flex-wrap gap-4 animate-fadeUp [animation-delay:0.55s] opacity-0">
          <Link to="/shop" className="btn-primary bg-ivory text-charcoal hover:bg-champagne-500">
            Shop Collection
          </Link>
          <Link to="/shop/new-arrivals" className="btn-secondary border-ivory/70 text-ivory hover:border-champagne-400 hover:bg-ivory/10">
            Explore New Arrivals
          </Link>
        </div>
      </div>
    </section>
  )
}
