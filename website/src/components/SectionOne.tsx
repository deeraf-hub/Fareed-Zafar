import { ChevronRight } from 'lucide-react';
import Reveal from './Reveal';
import { assets, hero } from '../content';

export default function SectionOne() {
  return (
    <section className="flex min-h-screen flex-col justify-between px-5 pb-12 pt-24 supports-[height:100svh]:min-h-[100svh] sm:px-8 sm:pt-28 md:px-12 md:pb-16">
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2">
          {hero.services.map((service, i) => (
            <Reveal key={service} delay={150 + i * 120}>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-white/90 drop-shadow-md">
                {service}
              </p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={300} className="max-w-xs sm:text-right">
          <p className="text-lg leading-relaxed text-white drop-shadow-md sm:text-xl">
            {hero.intro}
          </p>
        </Reveal>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Reveal delay={150}>
            <span className="mb-5 inline-block border-l-2 border-white bg-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white backdrop-blur-md">
              {hero.badge}
            </span>
          </Reveal>
          <Reveal delay={280}>
            <h1 className="text-5xl font-normal leading-[1.05] tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
              {hero.headline[0]}
              <br />
              {hero.headline[1]}
            </h1>
          </Reveal>
        </div>

        <Reveal delay={420}>
          <div className="flex items-center gap-4 rounded-xl bg-white/15 p-3 backdrop-blur-md">
            <img
              src={assets.portrait}
              alt={assets.portraitAlt}
              className="h-24 w-20 rounded-lg object-cover"
            />
            <div className="flex flex-col gap-1.5 pr-2">
              <p className="text-sm font-medium text-white">{hero.card.title}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/60">
                {hero.card.subtitle}
              </p>
              <a
                href="#contact"
                className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition-colors duration-300 hover:bg-white/85"
              >
                {hero.card.button}
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
