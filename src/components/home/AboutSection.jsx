import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { ABOUT_IMAGE } from '../../data/images.js'

const POINTS = [
  'Wide range of hand tools, power tools and hardware',
  'Competitive, transparent pricing on every product',
  'Quality tools sourced for everyday and professional use',
  'Friendly, reliable customer support in Lahore',
]

export default function AboutSection({ compact = false }) {
  return (
    <section className="bg-steel-50 py-16 md:py-20">
      <div className="container-app grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="order-2 lg:order-1">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-600">About Us</span>
          <h2 className="mt-2 font-heading text-3xl font-bold text-navy-900 md:text-4xl">
            Tools You Can Rely On
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-steel-600 md:text-base">
            Hand Tools Trading Corporation provides a broad range of hardware and hand tools for
            professionals, workshops, contractors and general customers across Lahore. From hammers
            and screwdrivers to drill machines, socket sets and fasteners, we stock the tools that
            keep jobs moving &mdash; at prices that make sense for every budget.
          </p>
          {!compact && (
            <p className="mt-3 text-sm leading-relaxed text-steel-600 md:text-base">
              Operating from our office at Arif Centre, we combine a wide product range with
              competitive pricing, quality tools and professional service, backed by a customer
              support team that&apos;s easy to reach by phone.
            </p>
          )}
          <ul className="mt-6 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-navy-800 md:text-base">
                <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-accent-500" />
                {point}
              </li>
            ))}
          </ul>
          <Link
            to="/about"
            className="mt-7 inline-flex rounded-md bg-navy-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            Learn More About Us
          </Link>
        </div>
        <div className="order-1 lg:order-2">
          <img
            src={ABOUT_IMAGE}
            alt="Interior of a hardware tools store showing a wide range of tools on display"
            className="aspect-[4/3] w-full rounded-lg object-cover shadow-md"
          />
        </div>
      </div>
    </section>
  )
}
