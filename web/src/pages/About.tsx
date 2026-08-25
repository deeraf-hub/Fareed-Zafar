import { BadgeCheck, Bike, MessageCircle, Tag, Users, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { siteConfig } from '../config/site';
import { useSeo } from '../lib/seo';
import { generalInquiryLink } from '../lib/whatsapp';

const values = [
  { icon: BadgeCheck, title: 'Quality products', text: 'Parts are checked before they are packed and dispatched.' },
  { icon: Tag, title: 'Competitive prices', text: 'Options across budgets, with prices listed openly on every product.' },
  { icon: Bike, title: 'Popular bike compatibility', text: 'Fitment is listed on every part, from CD 70 to GS 150.' },
  { icon: Users, title: 'Customer service', text: 'Ask before you order — we confirm fitment on WhatsApp or by phone.' },
  { icon: Wrench, title: 'Workshop stock', text: 'Mechanics and workshops can order the parts they use every day.' },
  { icon: MessageCircle, title: 'Reliable availability', text: 'Stock status is shown on each product, including when it runs out.' },
];

const About = () => {
  useSeo({
    title: `About Us | ${siteConfig.name}`,
    description:
      'Qalandari Autos & Spare Parts supplies motorcycle spare parts and accessories for everyday riders, mechanics, workshops and bike owners in Pakistan.',
  });

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About Us' }]} />

      <div className="mx-auto max-w-3xl">
        <h1 className="section-title">Your Trusted Motorcycle Spare Parts Store</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-600">
          {siteConfig.name} provides motorcycle spare parts and accessories for everyday riders, mechanics, workshops
          and bike owners. We stock the parts that keep the most common bikes in Pakistan on the road — Honda CD 70 and
          CG 125, CB 125F, Pridor, Yamaha YBR 125, Suzuki GD 110 and GS 150, along with United, Road Prince and Super
          Power 70cc models.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink-600">
          The catalogue is organised the way a workshop looks for parts: engine, electrical, brakes, suspension, chain
          and sprocket, controls, body parts and accessories. Every product lists the bikes it fits, the price in PKR
          and whether it is in stock, so you can decide before you order rather than after the part arrives.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink-600">
          If you are not sure which part your bike needs, send us the model and a photo of the old part on WhatsApp. We
          will confirm what fits, quote the price and tell you honestly if we do not have it.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {values.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink-900">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/shop" className="btn-primary px-6">
          Browse the shop
        </Link>
        <a href={generalInquiryLink()} target="_blank" rel="noreferrer noopener" className="btn-whatsapp px-6">
          <MessageCircle className="size-4" aria-hidden="true" /> Ask a question
        </a>
      </div>
    </div>
  );
};

export default About;
