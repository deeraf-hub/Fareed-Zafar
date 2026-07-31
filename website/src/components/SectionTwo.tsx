import { ChevronRight } from 'lucide-react';
import Reveal from './Reveal';
import { capability } from '../content';

export default function SectionTwo() {
  return (
    <section className="flex min-h-screen flex-col justify-between px-5 pb-12 pt-24 supports-[height:100svh]:min-h-[100svh] sm:px-8 sm:pt-28 md:px-12 md:pb-16">
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <Reveal delay={120}>
          <span className="inline-block border-l-2 border-white bg-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white backdrop-blur-md">
            {capability.badge}
          </span>
        </Reveal>
        <Reveal delay={220} className="max-w-sm sm:text-right">
          <p className="text-lg leading-relaxed text-white drop-shadow-md sm:text-xl">
            {capability.intro}
          </p>
        </Reveal>
      </div>

      <div className="flex flex-1 flex-col justify-end">
        <div className="flex flex-col gap-12 md:flex-row md:items-end md:justify-between md:gap-16">
          <div className="max-w-xl">
            <Reveal delay={180}>
              <h2 className="text-5xl font-normal leading-[1.05] tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
                {capability.headline[0]}
                <br />
                {capability.headline[1]}
              </h2>
            </Reveal>
            <Reveal delay={320}>
              <p className="mt-6 max-w-md text-sm text-white/80 drop-shadow-md sm:text-base">
                {capability.body}
              </p>
            </Reveal>
            <Reveal delay={420}>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#projects"
                  className="inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition-colors duration-300 hover:bg-white/85 sm:text-sm"
                >
                  {capability.primaryCta}
                  <ChevronRight size={14} />
                </a>
                <a
                  href="#contact"
                  className="rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-xs text-white backdrop-blur-md transition-colors duration-300 hover:bg-white/20 sm:text-sm"
                >
                  {capability.secondaryCta}
                </a>
              </div>
            </Reveal>
          </div>

          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 px-5 backdrop-blur-md sm:px-6">
            {capability.items.map((item, i) => (
              <Reveal
                key={item.index}
                delay={300 + i * 110}
                className={i < capability.items.length - 1 ? 'border-b border-white/15' : ''}
              >
                <div className="group flex gap-5 py-5">
                  <span className="font-mono text-[11px] tracking-[0.15em] text-white/55">
                    {item.index}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-1 text-base font-medium text-white sm:text-lg">
                      {item.title}
                      <ChevronRight
                        size={16}
                        className="text-white/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white"
                      />
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/70">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
