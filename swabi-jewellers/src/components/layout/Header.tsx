import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { primaryNav } from '@/config/navigation'
import { siteConfig } from '@/config/site'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { Logo } from '@/components/ui/Logo'
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from '@/components/ui/icons'
import { AnnouncementBar } from './AnnouncementBar'
import { MobileMenu } from './MobileMenu'
import { SearchOverlay } from './SearchOverlay'

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-champagne-500 px-1 text-[9px] font-medium text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { itemCount, openDrawer } = useCart()
  const wishlist = useWishlist()
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <>
      <div className="sticky top-0 z-50">
        <AnnouncementBar />
        <header
          className={`border-b bg-ivory/95 backdrop-blur transition-all duration-500 ease-luxe ${
            scrolled ? 'border-linen shadow-subtle' : 'border-transparent'
          }`}
        >
          <div
            className={`container-luxe flex items-center justify-between transition-all duration-500 ease-luxe ${
              scrolled ? 'h-16' : 'h-20 lg:h-24'
            }`}
          >
            <div className="flex flex-1 items-center gap-3 lg:flex-none">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="-ml-1 p-1 text-navy-700 lg:hidden"
                aria-label="Open menu"
              >
                <MenuIcon />
              </button>
              <Link to="/" aria-label={`${siteConfig.name} — home`}>
                <Logo markClassName={scrolled ? 'h-8 w-8 shrink-0' : 'h-9 w-9 shrink-0'} />
              </Link>
            </div>

            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center gap-7">
                {primaryNav.map((item) => (
                  <li key={item.label} className="group relative">
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `link-underline py-2 text-[11px] uppercase tracking-wideish transition-colors ${
                          isActive ? 'text-champagne-700' : 'text-navy-700 hover:text-champagne-700'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                    {item.children && (
                      <div className="invisible absolute left-1/2 top-full z-10 w-56 -translate-x-1/2 translate-y-1 border border-linen bg-ivory p-2 opacity-0 shadow-card transition-all duration-300 ease-luxe group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                        <ul>
                          {item.children.map((child) => (
                            <li key={child.to}>
                              <Link
                                to={child.to}
                                className="block px-3 py-2 text-xs text-navy-700 transition-colors hover:bg-cream hover:text-champagne-700"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2 lg:flex-none">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="p-2 text-navy-700 transition-colors hover:text-champagne-700"
                aria-label="Search"
              >
                <SearchIcon />
              </button>
              <Link
                to="/account"
                className="hidden p-2 text-navy-700 transition-colors hover:text-champagne-700 sm:block"
                aria-label="Account"
              >
                <UserIcon />
              </Link>
              <Link
                to="/wishlist"
                className="relative p-2 text-navy-700 transition-colors hover:text-champagne-700"
                aria-label={`Wishlist (${wishlist.count})`}
              >
                <HeartIcon />
                <CountBadge count={wishlist.count} />
              </Link>
              <button
                type="button"
                onClick={openDrawer}
                className="relative p-2 text-navy-700 transition-colors hover:text-champagne-700"
                aria-label={`Shopping bag (${itemCount})`}
              >
                <BagIcon />
                <CountBadge count={itemCount} />
              </button>
            </div>
          </div>
        </header>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
