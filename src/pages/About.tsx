import { Link } from 'react-router-dom'
import { PlaceholderArt } from '@/lib/placeholderArt'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { GemIcon, ShieldIcon, HeadsetIcon } from '@/components/ui/Icons'
import { useSeo } from '@/lib/useSeo'
import { siteConfig } from '@/config/site'

const pillars = [
  {
    icon: GemIcon,
    title: 'Craftsmanship',
    body: 'Every Swabi Jewellers piece is chosen and finished with care — [editable: describe your sourcing and finishing process here].',
  },
  {
    icon: ShieldIcon,
    title: 'Quality Promise',
    body: '[Editable: describe the quality standards, materials and guarantees Swabi Jewellers stands behind.]',
  },
  {
    icon: HeadsetIcon,
    title: 'Customer Service',
    body: 'From choosing the right piece to after-sales support, our team is here to help — [editable: add your service commitments].',
  },
]

export function About() {
  useSeo('About Us', `The story behind ${siteConfig.brandName} — elegance, quality, craftsmanship and customer trust.`)

  return (
    <div>
      <section className="relative h-[52vh] min-h-[380px] overflow-hidden">
        <PlaceholderArt scene="editorial" tone="beige" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent" />
        <div className="container-lux relative flex h-full flex-col justify-end pb-16 text-ivory">
          <span className="eyebrow text-ivory/85">About Swabi Jewellers</span>
          <h1 className="mt-3 max-w-xl text-4xl sm:text-5xl">Crafting Beauty, Creating Memories</h1>
        </div>
      </section>

      <section id="story" className="container-lux grid grid-cols-1 gap-12 py-20 sm:py-28 lg:grid-cols-2">
        <Reveal>
          <span className="eyebrow">Our Story</span>
          <h2 className="mt-3 text-3xl text-charcoal sm:text-4xl">A Jewellery Brand Built on Trust</h2>
          <p className="mt-5 leading-relaxed text-charcoal-muted">
            Swabi Jewellers is a jewellery brand focused on elegance, quality, craftsmanship and customer trust. We believe
            jewellery should feel personal — worn for everyday confidence and kept for life&rsquo;s most beautiful moments.
          </p>
          <p className="mt-4 leading-relaxed text-charcoal-muted">
            [Editable: this is where your founder story and company history goes. Replace this placeholder paragraph with
            the real story of how Swabi Jewellers started, who founded it, and what it stands for — nothing here is
            invented or assumed.]
          </p>
          <Link to="/shop" className="btn-secondary mt-6 inline-flex">
            Shop the Collection
          </Link>
        </Reveal>
        <Reveal delay={150} className="aspect-[4/5]">
          <PlaceholderArt scene="closeup" className="h-full w-full" showCaption caption="Founder's Note — Editable Placeholder" />
        </Reveal>
      </section>

      <section className="bg-cream/60 py-20 sm:py-28">
        <div className="container-lux">
          <SectionHeading eyebrow="What We Stand For" title="Elegance, Quality &amp; Trust" />
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {pillars.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 100} className="flex flex-col items-center gap-4 text-center">
                <pillar.icon width={28} height={28} className="text-champagne-600" />
                <h3 className="text-lg text-charcoal">{pillar.title}</h3>
                <p className="text-sm leading-relaxed text-charcoal-muted">{pillar.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
