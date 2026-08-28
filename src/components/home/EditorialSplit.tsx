import { Link } from 'react-router-dom'
import { PlaceholderArt } from '@/lib/placeholderArt'
import { Reveal } from '@/components/ui/Reveal'

export function EditorialSplit() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2">
      <Reveal className="aspect-[4/5] lg:aspect-auto">
        <PlaceholderArt scene="editorial" className="h-full w-full" showCaption caption="Editorial — Everyday Elegance" />
      </Reveal>
      <Reveal delay={150} className="flex flex-col items-start justify-center gap-6 bg-cream px-8 py-16 sm:px-14 lg:px-20">
        <span className="eyebrow">Our Philosophy</span>
        <h2 className="text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">Jewellery That Tells Your Story</h2>
        <p className="max-w-md text-base leading-relaxed text-charcoal-muted">
          From everyday elegance to unforgettable celebrations, discover pieces designed to become part of your story.
        </p>
        <Link to="/collections" className="btn-primary">
          Discover the Collection
        </Link>
      </Reveal>
    </section>
  )
}
