import { testimonials } from '@/data/testimonials'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Rating } from '@/components/ui/Rating'
import { Reveal } from '@/components/ui/Reveal'

export function Testimonials() {
  return (
    <section className="bg-charcoal py-20 text-ivory sm:py-28">
      <div className="container-lux">
        <SectionHeading eyebrow="Testimonials" title="Loved by Our Customers" />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={i * 70} className="flex flex-col gap-4 border border-ivory/10 p-7">
              <Rating value={t.rating} size={13} />
              <p className="text-[15px] italic leading-relaxed text-ivory/85">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-2">
                <p className="text-sm text-ivory">{t.author}</p>
                <p className="text-xs text-ivory/50">{t.location}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
