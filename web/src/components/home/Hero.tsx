import { ArrowRight, MessageCircle, ShieldCheck, Truck, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { generalInquiryLink } from '../../lib/whatsapp';
import { SearchBar } from '../shop/SearchBar';

export const Hero = () => (
  <section className="bg-ink-900 text-white">
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-16">
      <div>
        <span className="badge bg-brand-600/15 text-brand-400 ring-1 ring-inset ring-brand-600/30">
          <Wrench className="size-3.5" aria-hidden="true" /> Parts for Honda, Yamaha, Suzuki &amp; local bikes
        </span>

        <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          {siteConfig.tagline}
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-300">
          Find reliable spare parts and accessories for your motorcycle, with products suitable for popular bikes in
          Pakistan. Check compatibility before you buy, and pay cash on delivery.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/shop" className="btn-primary px-6">
            Shop Now <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link to="/contact" className="btn px-6 bg-white/10 text-white hover:bg-white/20">
            Contact Us
          </Link>
          <a href={generalInquiryLink()} target="_blank" rel="noreferrer noopener" className="btn-whatsapp px-6">
            <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
          </a>
        </div>

        <div className="mt-8 max-w-xl">
          <SearchBar size="lg" placeholder="Search “CD 70 chain set”, “brake shoe”, or a SKU…" />
          <p className="mt-2 text-xs text-ink-400">
            Popular searches: CD 70 spark plug • CG 125 brake shoe • chain set • battery
          </p>
        </div>

        <dl className="mt-8 grid gap-4 border-t border-ink-800 pt-6 text-sm sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden="true" />
            <div>
              <dt className="font-semibold text-white">Checked parts</dt>
              <dd className="text-xs text-ink-400">Inspected before dispatch</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Truck className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden="true" />
            <div>
              <dt className="font-semibold text-white">Cash on delivery</dt>
              <dd className="text-xs text-ink-400">Nationwide courier</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Wrench className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden="true" />
            <div>
              <dt className="font-semibold text-white">Fitment listed</dt>
              <dd className="text-xs text-ink-400">Compatible bikes on every part</dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="relative hidden lg:block">
        <div className="overflow-hidden rounded-2xl bg-white/5 p-8 ring-1 ring-white/10">
          <img
            src="/motorcycle.svg"
            alt="Illustration of a motorcycle, the bikes Qalandari Autos supplies parts for"
            width={480}
            height={280}
            className="w-full rounded-xl bg-white"
          />
          <div className="mt-6 grid grid-cols-3 gap-3">
            <img src="/products/spark-plug.svg" alt="" className="rounded-lg bg-white" loading="lazy" width={480} height={360} />
            <img src="/products/chain-set.svg" alt="" className="rounded-lg bg-white" loading="lazy" width={480} height={360} />
            <img src="/products/brake-shoe.svg" alt="" className="rounded-lg bg-white" loading="lazy" width={480} height={360} />
          </div>
        </div>
      </div>
    </div>
  </section>
);
