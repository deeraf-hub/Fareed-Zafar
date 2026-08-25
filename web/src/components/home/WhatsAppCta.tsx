import { MessageCircle, Phone } from 'lucide-react';
import { siteConfig } from '../../config/site';
import { generalInquiryLink } from '../../lib/whatsapp';

export const WhatsAppCta = () => (
  <section className="overflow-hidden rounded-2xl bg-ink-900 px-6 py-10 text-white sm:px-10">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Not sure which part fits your bike?</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          Send us your bike model and the part you need on WhatsApp. Share a photo of the old part if you have one and
          we will confirm the right item, the price and availability before you order.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={generalInquiryLink()} target="_blank" rel="noreferrer noopener" className="btn-whatsapp px-6">
          <MessageCircle className="size-4" aria-hidden="true" /> Message on WhatsApp
        </a>
        <a href={siteConfig.phoneHref} className="btn px-6 bg-white/10 text-white hover:bg-white/20">
          <Phone className="size-4" aria-hidden="true" /> {siteConfig.phone}
        </a>
      </div>
    </div>
  </section>
);
