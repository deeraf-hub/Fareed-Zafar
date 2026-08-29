import { NavLink } from 'react-router-dom'
import { Phone, X } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { BUSINESS } from '../../data/business.js'

export default function MobileMenu({ isOpen, onClose, links }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-navy-950/60" aria-label="Close menu" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xs flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
          <Logo />
          <button type="button" onClick={onClose} aria-label="Close menu" className="text-steel-500 hover:text-navy-900">
            <X size={22} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={onClose}
              className={({ isActive }) =>
                `rounded-md px-3 py-3 text-base font-semibold uppercase tracking-wide ${
                  isActive ? 'bg-navy-800 text-white' : 'text-navy-800 hover:bg-steel-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-steel-100 p-5">
          <a
            href={`tel:${BUSINESS.phoneHref}`}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-500 py-3 text-sm font-semibold text-white hover:bg-accent-600"
          >
            <Phone size={16} />
            Call {BUSINESS.phoneDisplay}
          </a>
        </div>
      </div>
    </div>
  )
}
