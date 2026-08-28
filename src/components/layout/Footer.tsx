import { Link } from 'react-router-dom'
import { siteConfig } from '@/config/site'
import { FacebookIcon, InstagramIcon, TiktokIcon } from '@/components/ui/Icons'
import { Logo } from '@/components/ui/Logo'

const columns: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Shop',
    links: [
      { label: 'All Jewellery', to: '/shop' },
      { label: 'New Arrivals', to: '/shop/new-arrivals' },
      { label: 'Best Sellers', to: '/shop?sort=best-selling' },
      { label: 'Bridal', to: '/collections/bridal' },
      { label: 'Collections', to: '/collections' },
    ],
  },
  {
    title: 'Customer Care',
    links: [
      { label: 'Contact Us', to: '/contact' },
      { label: 'Delivery Information', to: '/policies/delivery-information' },
      { label: 'Returns & Exchanges', to: '/policies/returns-exchanges' },
      { label: 'Jewellery Care', to: '/policies/jewellery-care' },
      { label: 'FAQs', to: '/faqs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Our Story', to: '/about#story' },
      { label: 'Contact', to: '/contact' },
      { label: 'Privacy Policy', to: '/policies/privacy-policy' },
      { label: 'Terms & Conditions', to: '/policies/terms-conditions' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-charcoal text-ivory">
      <div className="container-lux grid grid-cols-2 gap-10 py-16 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
        <div className="col-span-2 flex flex-col gap-4 lg:col-span-2">
          <Link to="/" aria-label={siteConfig.brandName}>
            <Logo tone="ivory" markClassName="h-10 w-auto" />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-ivory/65">{siteConfig.supportingText}</p>
          <div className="flex items-center gap-3 pt-2">
            <a
              href={siteConfig.social.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center border border-ivory/25 transition-colors hover:border-champagne-500 hover:text-champagne-400"
            >
              <InstagramIcon />
            </a>
            <a
              href={siteConfig.social.facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="flex h-9 w-9 items-center justify-center border border-ivory/25 transition-colors hover:border-champagne-500 hover:text-champagne-400"
            >
              <FacebookIcon />
            </a>
            <a
              href={siteConfig.social.tiktokUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="flex h-9 w-9 items-center justify-center border border-ivory/25 transition-colors hover:border-champagne-500 hover:text-champagne-400"
            >
              <TiktokIcon />
            </a>
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs uppercase tracking-widest2 text-champagne-500">{col.title}</h4>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-ivory/70 transition-colors hover:text-ivory">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="text-xs uppercase tracking-widest2 text-champagne-500">Contact</h4>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-ivory/70">
            <li>
              <a href={siteConfig.contact.phoneHref} className="hover:text-ivory">
                {siteConfig.contact.phone}
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${siteConfig.contact.phoneHref.replace('tel:+', '')}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-ivory"
              >
                WhatsApp: {siteConfig.contact.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${siteConfig.contact.email}`} className="hover:text-ivory">
                {siteConfig.contact.email}
              </a>
            </li>
            <li className="leading-relaxed">{siteConfig.contact.address}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-lux flex flex-col items-center justify-between gap-2 py-5 text-xs text-ivory/50 sm:flex-row">
          <p>© {new Date().getFullYear()} {siteConfig.brandName}. All rights reserved.</p>
          <p>Demo storefront — products and pricing shown are for illustration.</p>
        </div>
      </div>
    </footer>
  )
}
