import { Link } from 'react-router-dom'
import { categories } from '@/data/categories'
import { Photo } from '@/components/ui/Photo'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'

export function CategoryGrid() {
  return (
    <section className="container-lux py-20 sm:py-28">
      <SectionHeading eyebrow="Shop by Category" title="Explore Our Collections" />

      <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {categories.map((category, i) => (
          <Reveal key={category.slug} delay={i * 60}>
            <Link to={`/shop/${category.slug}`} className="group relative block aspect-[3/4] overflow-hidden">
              <Photo
                photoKey={category.photo}
                className="h-full w-full transition-transform duration-700 ease-luxe group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/0 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-4 text-center">
                <span className="font-display text-lg text-ivory sm:text-xl">{category.name}</span>
                <span className="h-px w-8 bg-champagne-400 transition-all duration-500 group-hover:w-14" />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
