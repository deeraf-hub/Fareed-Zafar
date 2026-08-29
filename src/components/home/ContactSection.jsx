import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { BUSINESS } from '../../data/business.js'

export default function ContactSection({ compact = false }) {
  return (
    <section className="bg-navy-950 py-16 md:py-20">
      <div className="container-app grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-accent-400">Get In Touch</span>
          <h2 className="mt-2 font-heading text-3xl font-bold text-white md:text-4xl">
            Visit Or Call Us Today
          </h2>
          <p className="mt-4 max-w-md text-sm text-steel-300 md:text-base">
            Have a question about a product or need bulk pricing? Reach out directly &mdash; our team
            is ready to help.
          </p>

          <div className="mt-8 space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent-400">
                <MapPin size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{BUSINESS.name}</p>
                <p className="text-sm text-steel-300">{BUSINESS.fullAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent-400">
                <Phone size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Phone</p>
                <a href={`tel:${BUSINESS.phoneHref}`} className="text-sm text-steel-300 hover:text-accent-400">
                  {BUSINESS.phoneDisplay}
                </a>
              </div>
            </div>
            {!compact && (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent-400">
                    <Mail size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Email</p>
                    <a href={`mailto:${BUSINESS.email}`} className="text-sm text-steel-300 hover:text-accent-400">
                      {BUSINESS.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent-400">
                    <Clock size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Business Hours</p>
                    <p className="text-sm text-steel-300">{BUSINESS.hours}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <a
            href={`tel:${BUSINESS.phoneHref}`}
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            <Phone size={17} />
            Call Now
          </a>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10 shadow-md">
          <iframe
            title="Hand Tools Trading Corporation location on map"
            src={BUSINESS.mapsEmbedSrc}
            className="h-80 w-full lg:h-full lg:min-h-[380px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  )
}
