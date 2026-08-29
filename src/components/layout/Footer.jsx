import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { BUSINESS } from '../../data/business.js'
import { CATEGORIES } from '../../data/categories.js'

const FOOTER_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-navy-700 bg-navy-950 text-steel-200">
      <div className="container-app grid grid-cols-1 gap-10 py-12 md:grid-cols-4">
        <div>
          <Logo variant="light" />
          <p className="mt-4 text-sm text-steel-300">{BUSINESS.tagline}</p>
          <p className="mt-4 text-xs leading-relaxed text-steel-400">
            Reliable hardware and hand tools for workshops, professionals, contractors and everyday
            projects in Lahore, Pakistan.
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-white">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            {FOOTER_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-steel-300 transition-colors hover:text-accent-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-white">Categories</h3>
          <ul className="space-y-2 text-sm">
            {CATEGORIES.slice(0, 6).map((cat) => (
              <li key={cat.id}>
                <Link to={`/shop?category=${cat.id}`} className="text-steel-300 transition-colors hover:text-accent-400">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-white">Contact</h3>
          <ul className="space-y-3 text-sm text-steel-300">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-accent-400" />
              <span>{BUSINESS.fullAddress}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="shrink-0 text-accent-400" />
              <a href={`tel:${BUSINESS.phoneHref}`} className="hover:text-accent-400">
                {BUSINESS.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="shrink-0 text-accent-400" />
              <a href={`mailto:${BUSINESS.email}`} className="hover:text-accent-400">
                {BUSINESS.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-navy-800 py-5">
        <p className="container-app text-center text-xs text-steel-400">
          © {year} Hand Tools Trading Corporation. All Rights Reserved.
        </p>
      </div>
    </footer>
  )
}
