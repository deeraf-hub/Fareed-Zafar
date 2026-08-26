import { modelStories } from '@/data/editorial'
import { SmartImage } from '@/components/ui/SmartImage'
import { Reveal } from '@/components/ui/Reveal'
import { ArrowRightIcon } from '@/components/ui/icons'
import { Link } from 'react-router-dom'

/** The three model-led editorial panels that carry the homepage between product blocks. */
export function ModelStories({ ids }: { ids?: string[] }) {
  const stories = ids ? modelStories.filter((story) => ids.includes(story.id)) : modelStories

  return (
    <section className="container-luxe space-y-20 py-20 lg:space-y-28 lg:py-28">
      {stories.map((story) => (
        <div
          key={story.id}
          className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
            story.align === 'left' ? '' : 'lg:[&>*:first-child]:order-2'
          }`}
        >
          <Reveal animation="image-reveal">
            <SmartImage
              image={story.image}
              ratio="aspect-[4/5]"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </Reveal>
          <Reveal delay={120}>
            <p className="eyebrow">{story.eyebrow}</p>
            <h2 className="mt-4 text-3xl leading-tight text-balance sm:text-4xl">{story.headline}</h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stoneish">{story.body}</p>
            <Link
              to={story.cta.href}
              className="link-underline mt-7 inline-flex items-center gap-2 text-[11px] uppercase tracking-wideish text-navy-700"
            >
              {story.cta.label}
              <ArrowRightIcon width={16} height={16} />
            </Link>
          </Reveal>
        </div>
      ))}
    </section>
  )
}
