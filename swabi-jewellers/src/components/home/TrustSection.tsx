import { trustPoints } from '@/data/editorial'
import { ICON_MAP } from '@/components/ui/icons'
import { Reveal } from '@/components/ui/Reveal'

export function TrustSection() {
  return (
    <section className="border-y border-linen bg-cream/60">
      <div className="container-luxe py-16 lg:py-20">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-5">
          {trustPoints.map((point, index) => {
            const Icon = ICON_MAP[point.icon]
            return (
              <Reveal as="li" key={point.id} delay={index * 80} className="text-center">
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
  )
}
