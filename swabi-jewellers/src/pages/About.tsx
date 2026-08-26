import { aboutContent, trustPoints } from '@/data/editorial'
import { siteConfig } from '@/config/site'
import { Seo } from '@/components/Seo'
import { SmartImage } from '@/components/ui/SmartImage'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Reveal } from '@/components/ui/Reveal'
import { ButtonLink } from '@/components/ui/Button'
import { ICON_MAP } from '@/components/ui/icons'
import { SocialGallery } from '@/components/home/SocialGallery'

export default function About() {
  return (
    <>
      <Seo
        title="About Us"
        description="Swabi Jewellers — crafting beauty, creating memories. Imitation jewellery made with care in Karachi, Pakistan."
      />

      <section className="bg-cream">
        <div className="grid lg:grid-cols-2">
          <div className="flex items-center px-6 py-16 sm:px-12 lg:px-16 lg:py-24">
            <div className="max-w-lg">
              <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About' }]} className="mb-8" />
              <p className="eyebrow">Our story</p>
              <h1 className="mt-4 font-display text-4xl leading-tight text-balance lg:text-[52px]">
                {aboutContent.headline}
              </h1>
              <p className="mt-6 text-[15px] leading-relaxed text-stoneish">{aboutContent.intro}</p>
            </div>
          </div>
          <Reveal animation="image-reveal" className="h-full">
            <SmartImage
              image={aboutContent.image}
              ratio="aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[620px]"
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      <section className="container-luxe py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {aboutContent.sections.map((section, index) => (
            <Reveal key={section.id} delay={index * 80} className="scroll-mt-32">
              <div id={section.id}>
                <h2 className="font-display text-2xl">{section.title}</h2>
                <div className="mt-4 h-px w-12 bg-champagne-400" />
                <p className="mt-5 text-[15px] leading-relaxed text-stoneish">{section.body}</p>
                <p className="mt-3 text-[11px] uppercase tracking-wideish text-champagne-600">
                  Editable content placeholder
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-linen bg-cream/60">
        <div className="container-luxe py-16 lg:py-20">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-5">
            {trustPoints.map((point, index) => {
              const Icon = ICON_MAP[point.icon]
              return (
                <Reveal as="li" key={point.id} delay={index * 70} className="text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-champagne-200 text-champagne-600">
                    <Icon />
                  </span>
                  <h3 className="mt-5 font-display text-lg">{point.title}</h3>
                  <p className="mx-auto mt-2 max-w-[16rem] text-xs leading-relaxed text-stoneish">
                    {point.body}
                  </p>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="container-luxe py-20 text-center lg:py-24">
        <h2 className="font-display text-3xl">Visit Us in Karachi</h2>
        <address className="mx-auto mt-4 max-w-sm not-italic text-sm leading-relaxed text-stoneish">
          {siteConfig.contact.addressLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          <span className="mt-2 block">{siteConfig.contact.hours}</span>
        </address>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/contact">Contact Us</ButtonLink>
          <ButtonLink to="/shop" variant="outline">
            Shop the Collection
          </ButtonLink>
        </div>
      </section>

      <SocialGallery />
    </>
  )
}
