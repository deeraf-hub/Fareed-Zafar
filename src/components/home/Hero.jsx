import { Link } from 'react-router-dom'
import { ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { HERO_IMAGE } from '../../data/images.js'

const TRUST_ITEMS = [
  { icon: Sparkles, label: 'Wide Range' },
  { icon: Wallet, label: 'Competitive Prices' },
  { icon: ShieldCheck, label: 'Reliable Quality' },
]

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-950">
      <img
        src={HERO_IMAGE}
        alt="Hand tools including hammers, screwdrivers, wrenches and drill machines arranged on a workshop wall"
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/50" />

      <div className="container-app relative flex flex-col gap-6 py-20 md:py-28 lg:py-36">
        <span className="inline-flex w-fit items-center rounded-full border border-accent-500/40 bg-accent-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-400">
          Hand Tools Trading Corporation · Lahore
        </span>
        <h1 className="max-w-2xl font-heading text-4xl font-bold leading-tight text-white md:text-6xl">
          Quality Tools for Every Job
        </h1>
        <p className="max-w-xl text-base text-steel-200 md:text-lg">
          Reliable hardware and hand tools for workshops, professionals, contractors and everyday
          projects.
        </p>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            to="/shop"
            className="rounded-md bg-accent-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 md:text-base"
          >
            Shop Tools
          </Link>
          <Link
            to="/categories"
            className="rounded-md border border-white/30 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15 md:text-base"
          >
            Explore Categories
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm font-medium text-steel-200">
              <Icon size={18} className="text-accent-400" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
