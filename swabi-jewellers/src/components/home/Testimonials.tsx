import { testimonials } from '@/data/reviews'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Rating } from '@/components/ui/Rating'
import { Reveal } from '@/components/ui/Reveal'
import { formatDate } from '@/lib/format'

export function Testimonials() {
  return (
    <section className="container-luxe py-20 lg:py-28">
      <SectionHeading
        eyebrow="Reviews"
        title="Loved by Our Customers"
        description="A few words from customers across Pakistan. Verified reviews are collected after delivery."
      />

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
        {testimonials.map((review, index) => (
          <Reveal as="li" key={review.id} delay={index * 70} className="h-full">
            <figure className="flex h-full flex-col border border-linen bg-white p-7">
              <Rating value={review.rating} />
              <blockquote className="mt-4 flex-1 font-display text-lg leading-relaxed text-navy-700">
                “{review.body}”
              </blockquote>
              <figcaption className="mt-6 border-t border-linen pt-4 text-xs text-stoneish">
                <span className="block text-navy-700">{review.author}</span>
                <span>
                  {review.city} · {formatDate(review.date)}
                  {review.verified && ' · Verified purchase'}
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
