import { Menu, Phone, Search, ShoppingCart, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { useCart } from '../../store/CartContext';
import { SearchBar } from '../shop/SearchBar';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/track-order', label: 'Track Order' },
];

export const Header = () => {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEscapeKey(menuOpen, useCallback(() => setMenuOpen(false), []));
  useEscapeKey(searchOpen, useCallback(() => setSearchOpen(false), []));

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
      {/* Utility strip */}
      <div className="hidden bg-ink-900 text-ink-100 lg:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p>Motorcycle spare parts for Honda, Yamaha, Suzuki, United, Road Prince &amp; Super Power</p>
          <a href={siteConfig.phoneHref} className="flex items-center gap-1.5 transition-colors hover:text-white">
            <Phone className="size-3.5" aria-hidden="true" /> {siteConfig.phone}
          </a>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-3 lg:h-20 lg:gap-6">
        <button
          type="button"
          className="btn-ghost -ml-2 px-2 lg:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>

        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${siteConfig.name} — home`}>
          <img src="/logo.svg" alt="" className="size-10 rounded-xl" width={40} height={40} />
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight text-ink-900 sm:text-base">Qalandari Autos</span>
            <span className="block text-[10px] font-medium uppercase tracking-widest text-brand-600 sm:text-[11px]">
              &amp; Spare Parts
            </span>
          </span>
        </Link>

        <div className="ml-auto hidden max-w-xl flex-1 lg:block">
          <SearchBar />
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {navItems.slice(0, 3).map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button
            type="button"
            className="btn-ghost px-2 lg:hidden"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="Search products"
            aria-expanded={searchOpen}
          >
            <Search className="size-5" aria-hidden="true" />
          </button>

          <a href={siteConfig.phoneHref} className="btn-dark hidden px-3 sm:inline-flex">
            <Phone className="size-4" aria-hidden="true" />
            <span className="hidden xl:inline">{siteConfig.phone}</span>
          </a>

          <Link to="/cart" className="btn-ghost relative px-2" aria-label={`Cart, ${itemCount} items`}>
            <ShoppingCart className="size-5" aria-hidden="true" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 top-1 flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Secondary nav on desktop */}
      <div className="hidden border-t border-ink-100 lg:block">
        <div className="container-page flex h-11 items-center gap-1">
          {navItems.slice(3).map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
          <span className="ml-auto text-xs text-ink-500">
            Cash on delivery • Free delivery over PKR {siteConfig.freeDeliveryOver.toLocaleString('en-PK')}
          </span>
        </div>
      </div>

      {/* Mobile search drawer */}
      {searchOpen && (
        <div className="border-t border-ink-100 p-3 lg:hidden">
          <SearchBar autoFocus onSubmitted={() => setSearchOpen(false)} />
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white">
            <div className="flex h-16 items-center justify-between border-b border-ink-200 px-4">
              <span className="text-base font-bold text-ink-900">Menu</span>
              <button
                type="button"
                className="btn-ghost px-2"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `flex min-h-12 items-center rounded-lg px-3 text-base font-medium ${
                          isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-700'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="space-y-2 border-t border-ink-200 p-4">
              <a href={siteConfig.phoneHref} className="btn-primary w-full">
                <Phone className="size-4" aria-hidden="true" /> Call {siteConfig.phone}
              </a>
              <Link to="/contact" className="btn-outline w-full">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
