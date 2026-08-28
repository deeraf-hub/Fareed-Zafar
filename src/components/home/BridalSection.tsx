import { Link } from 'react-router-dom'
import { Photo } from '@/components/ui/Photo'
import { Reveal } from '@/components/ui/Reveal'

const highlights = ['Bridal Necklace', 'Earrings', 'Matha Patti', 'Bangles', 'Rings']

export function BridalSection() {
  return (
    <section className="relative overflow-hidden bg-charcoal text-ivory">
      <Photo photoKey="model-bridal" className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/85 to-transparent" />

      <div className="container-lux relative flex min-h-[560px] flex-col justify-center py-20">
        <Reveal className="max-w-xl">
          <span className="eyebrow text-champagne-400">Bridal Collection</span>
          <h2 className="mt-4 text-3xl leading-tight sm:text-4xl lg:text-5xl">For Your Most Beautiful Day</h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ivory/80">
            A complete bridal look — designed to feel luxurious, emotional, and entirely your own.
          </p>

          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ivory/70">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-champagne-400" />
                {h}
              </li>
            ))}
          </ul>

          <Link to="/collections/bridal" className="btn-primary mt-9 bg-champagne-500 text-charcoal hover:bg-ivory">
            Explore Bridal Collection
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
