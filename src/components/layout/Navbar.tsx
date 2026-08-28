import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { siteConfig } from '@/config/site'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { SearchIcon, UserIcon, HeartIcon, BagIcon, MenuIcon } from '@/components/ui/Icons'
import { SearchOverlay } from './SearchOverlay'
import { MobileMenu } from './MobileMenu'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Jewellery', to: '/shop' },
  { label: 'New Arrivals', to: '/shop/new-arrivals' },
  { label: 'Collections', to: '/collections' },
  { label: 'Bridal', to: '/collections/bridal' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

function IconBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-champagne-600 px-1 text-[10px] font-medium text-charcoal">
      {count}
    </span>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { itemCount } = useCart()
  const { productIds } = useWishlist()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-ivory/95 backdrop-blur-sm border-b border-beige/70">
      <div
        className={`container-lux flex items-center justify-between transition-[padding] duration-300 ease-luxe ${
          scrolled ? 'py-3' : 'py-5'
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="text-charcoal lg:hidden"
        >
          <MenuIcon />
        </button>

        <Link to="/" className="mx-auto lg:mx-0 flex flex-col items-center leading-none lg:items-start">
          <span className="font-display text-2xl sm:text-[28px] tracking-wide text-charcoal">{siteConfig.brandName}</span>
          <span className="hidden sm:block text-[9px] uppercase tracking-widest2 text-champagne-700">Fine Jewellery</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `text-[13px] uppercase tracking-[0.12em] transition-colors duration-300 hover:text-champagne-700 ${
                  isActive ? 'text-champagne-700' : 'text-charcoal'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4 sm:gap-5 text-charcoal">
          <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" className="hover:text-champagne-700">
            <SearchIcon />
          </button>
          <Link to="/account" aria-label="Account" className="hidden sm:inline-flex hover:text-champagne-700">
            <UserIcon />
          </Link>
          <Link to="/wishlist" aria-label="Wishlist" className="relative hover:text-champagne-700">
            <HeartIcon />
            <IconBadge count={productIds.length} />
          </Link>
          <Link to="/cart" aria-label="Shopping bag" className="relative hover:text-champagne-700">
            <BagIcon />
            <IconBadge count={itemCount} />
          </Link>
        </div>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={navLinks} />
    </header>
  )
}
