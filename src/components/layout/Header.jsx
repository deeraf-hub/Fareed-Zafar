import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, Phone, Search, ShoppingCart } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import SearchOverlay from '../shop/SearchOverlay.jsx'
import MobileMenu from './MobileMenu.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { BUSINESS } from '../../data/business.js'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
]

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { itemCount, setCartOpen } = useCart()

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-steel-100 bg-white/95 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between gap-4 md:h-20">
          <Logo />

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `text-sm font-semibold uppercase tracking-wide transition-colors ${
                    isActive ? 'text-accent-600' : 'text-navy-800 hover:text-accent-600'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 md:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              className="flex h-10 w-10 items-center justify-center rounded-full text-navy-800 hover:bg-steel-50"
            >
              <Search size={20} />
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-navy-800 hover:bg-steel-50"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[11px] font-bold text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
            <a
              href={`tel:${BUSINESS.phoneHref}`}
              className="hidden items-center gap-2 rounded-md bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 md:inline-flex"
            >
              <Phone size={16} />
              Call Now
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-navy-800 hover:bg-steel-50 lg:hidden"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} links={NAV_LINKS} />
    </>
  )
}
