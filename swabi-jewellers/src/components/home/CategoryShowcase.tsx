import { Link } from 'react-router-dom'
import { categories } from '@/data/categories'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/ui/SmartImage'
import { Reveal } from '@/components/ui/Reveal'

export function CategoryShowcase() {
  return (
    <section className="container-luxe py-20 lg:py-28">
      <SectionHeading
        eyebrow="Shop by category"
        title="Explore Our Collections"
        description="Eight ways into the collection — from the chain you wear every day to a complete bridal suite."
      />

      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:mt-16 lg:grid-cols-4 lg:gap-x-8">
        {categories.map((category, index) => {
          const to = category.slug === 'new-arrivals' ? '/new-arrivals' : `/shop/${category.slug}`
          return (
            <Reveal key={category.slug} delay={Math.min(index, 7) * 70}>
              <Link to={to} className="group block">
                <div className="overflow-hidden bg-cream">
                  <SmartImage
                    image={category.image}
                    ratio="aspect-[3/4]"
                    className="card-hover-media"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                </div>
                <h3 className="mt-4 font-display text-xl">
                  <span className="link-underline">{category.name}</span>
                </h3>
                <p className="mt-1 text-xs text-stoneish">{category.tagline}</p>
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
