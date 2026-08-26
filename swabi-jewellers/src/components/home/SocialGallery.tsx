import { socialGallery } from '@/data/editorial'
import { siteConfig } from '@/config/site'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/ui/SmartImage'
import { Reveal } from '@/components/ui/Reveal'
import { InstagramIcon } from '@/components/ui/icons'

export function SocialGallery() {
  return (
    <section className="bg-cream/60 py-20 lg:py-24">
      <div className="container-luxe">
        <SectionHeading
          eyebrow={siteConfig.social.instagram.handle}
          title="Follow the Swabi Jewellers Story"
          description="New pieces, styling ideas and behind-the-scenes from the workshop."
        />

        <ul className="mt-12 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          {socialGallery.map((image, index) => (
            <Reveal as="li" key={image.id} delay={index * 60}>
              <a
                href={siteConfig.social.instagram.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative block overflow-hidden"
                aria-label={`${image.alt} — open Instagram`}
              >
                <SmartImage
                  image={image}
                  ratio="aspect-square"
                  className="card-hover-media"
                  sizes="(min-width: 1024px) 16vw, 33vw"
                  width={500}
                  height={500}
                />
                <span className="absolute inset-0 grid place-items-center bg-navy-900/35 text-ivory opacity-0 transition-opacity duration-500 ease-luxe group-hover:opacity-100">
                  <InstagramIcon width={22} height={22} />
                </span>
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
