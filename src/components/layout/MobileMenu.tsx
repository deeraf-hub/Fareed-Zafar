import { useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { CloseIcon, UserIcon } from '@/components/ui/Icons'
import { siteConfig } from '@/config/site'

export function MobileMenu({
  open,
  onClose,
  links,
}: {
  open: boolean
  onClose: () => void
  links: { label: string; to: string }[]
}) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div
      className={`fixed inset-0 z-[90] lg:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 bg-charcoal/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute left-0 top-0 h-full w-[82%] max-w-xs bg-ivory shadow-lift transition-transform duration-400 ease-luxe ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-beige px-5 py-4">
          <span className="font-display text-xl text-charcoal">{siteConfig.brandName}</span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="text-charcoal">
            <CloseIcon />
          </button>
        </div>
        <nav className="flex flex-col px-5 py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `border-b border-beige/70 py-3.5 text-sm uppercase tracking-[0.14em] ${
                  isActive ? 'text-champagne-700' : 'text-charcoal'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <Link
            to="/account"
            onClick={onClose}
            className="mt-4 flex items-center gap-2 text-sm uppercase tracking-[0.14em] text-charcoal"
          >
            <UserIcon width={18} height={18} /> My Account
          </Link>
        </nav>
      </div>
    </div>
  )
}
