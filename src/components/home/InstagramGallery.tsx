import { instagramPosts } from '@/data/instagram'
import { Photo } from '@/components/ui/Photo'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'
import { siteConfig } from '@/config/site'

export function InstagramGallery() {
  return (
    <section className="container-lux py-20 sm:py-28">
      <SectionHeading
        eyebrow="@swabijewellers"
        title="Follow the Swabi Jewellers Story"
        description={`Tag us ${siteConfig.social.instagram} to be featured.`}
      />

      <div className="mt-12 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {[...instagramPosts, ...instagramPosts].slice(0, 6).map((post, i) => (
          <Reveal key={`${post.id}-${i}`} delay={i * 50}>
            <a
              href={siteConfig.social.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-square overflow-hidden"
            >
              <Photo photoKey={post.photo} className="h-full w-full transition-transform duration-700 ease-luxe group-hover:scale-110" />
              <div className="absolute inset-0 flex items-end bg-charcoal/0 p-3 transition-colors duration-300 group-hover:bg-charcoal/40">
                <span className="translate-y-2 text-[11px] text-ivory opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {post.caption}
                </span>
              </div>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
