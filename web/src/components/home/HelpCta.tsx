import { Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

export const HelpCta = () => (
  <section className="overflow-hidden rounded-2xl bg-ink-900 px-6 py-10 text-white sm:px-10">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Not sure which part fits your bike?</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          Call the shop with your bike model and the part you need, or email us a photo of the old part. We will confirm
          the right item, the price and availability before you order.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={siteConfig.phoneHref} className="btn-primary px-6">
          <Phone className="size-4" aria-hidden="true" /> {siteConfig.phone}
        </a>
        <a href={`mailto:${siteConfig.email}`} className="btn px-6 bg-white/10 text-white hover:bg-white/20">
          <Mail className="size-4" aria-hidden="true" /> {siteConfig.email}
        </a>
        <Link to="/contact" className="btn px-6 bg-white/10 text-white hover:bg-white/20">
          Contact page
        </Link>
      </div>
    </div>
  </section>
);
