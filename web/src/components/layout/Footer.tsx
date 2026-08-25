import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { categories } from '../../data/categories';
import { generalInquiryLink } from '../../lib/whatsapp';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from './SocialIcons';

const shopLinks = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/track-order', label: 'Track Order' },
];

const policyLinks = [
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-and-conditions', label: 'Terms & Conditions' },
  { to: '/shipping-policy', label: 'Shipping Policy' },
  { to: '/return-policy', label: 'Return Policy' },
];

export const Footer = () => (
  <footer className="mt-16 bg-ink-900 text-ink-300">
    <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" className="size-10 rounded-xl" width={40} height={40} />
          <span className="leading-tight">
            <span className="block text-base font-bold text-white">Qalandari Autos</span>
            <span className="block text-[11px] font-medium uppercase tracking-widest text-brand-500">
              &amp; Spare Parts
            </span>
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          Motorcycle spare parts and accessories for everyday riders, mechanics and workshops — engine, electrical,
          brake, suspension and chain parts for popular bikes in Pakistan.
        </p>
        <div className="mt-5 flex gap-2">
          <a
            href={siteConfig.social.facebook}
            target="_blank"
            rel="noreferrer noopener"
            className="flex size-10 items-center justify-center rounded-lg bg-ink-800 transition-colors hover:bg-brand-600 hover:text-white"
            aria-label="Facebook"
          >
            <FacebookIcon />
          </a>
          <a
            href={siteConfig.social.instagram}
            target="_blank"
            rel="noreferrer noopener"
            className="flex size-10 items-center justify-center rounded-lg bg-ink-800 transition-colors hover:bg-brand-600 hover:text-white"
            aria-label="Instagram"
          >
            <InstagramIcon />
          </a>
          <a
            href={siteConfig.social.youtube}
            target="_blank"
            rel="noreferrer noopener"
            className="flex size-10 items-center justify-center rounded-lg bg-ink-800 transition-colors hover:bg-brand-600 hover:text-white"
            aria-label="YouTube"
          >
            <YoutubeIcon />
          </a>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Shop</h2>
        <ul className="mt-4 space-y-2.5 text-sm">
          {shopLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Categories</h2>
        <ul className="mt-4 space-y-2.5 text-sm">
          {categories.slice(0, 6).map((category) => (
            <li key={category.id}>
              <Link to={`/category/${category.slug}`} className="transition-colors hover:text-white">
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Contact</h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex gap-2.5">
            <Phone className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
            <a href={siteConfig.phoneHref} className="transition-colors hover:text-white">
              {siteConfig.phone}
            </a>
          </li>
          <li className="flex gap-2.5">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
            <a href={generalInquiryLink()} target="_blank" rel="noreferrer noopener" className="transition-colors hover:text-white">
              WhatsApp us
            </a>
          </li>
          <li className="flex gap-2.5">
            <Mail className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
            <a href={`mailto:${siteConfig.email}`} className="transition-colors hover:text-white">
              {siteConfig.email}
            </a>
          </li>
          <li className="flex gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
            <address className="not-italic">
              {siteConfig.address.line1}
              <br />
              {siteConfig.address.line2}, {siteConfig.address.city}
            </address>
          </li>
        </ul>
        <p className="mt-4 text-xs text-ink-400">
          {siteConfig.businessHours.map((entry) => `${entry.days}: ${entry.hours}`).join(' • ')}
        </p>
      </div>
    </div>

    <div className="border-t border-ink-800">
      <div className="container-page flex flex-col gap-3 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 {siteConfig.name}. All Rights Reserved.</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {policyLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/admin" className="transition-colors hover:text-white">
              Admin
            </Link>
          </li>
        </ul>
      </div>
    </div>
  </footer>
);
