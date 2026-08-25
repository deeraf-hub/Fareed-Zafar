import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  Store,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { useAdminAuth } from '../../store/AdminAuthContext';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/categories', label: 'Categories', icon: Boxes },
];

/** Guards every admin route and renders the shell around them. */
export const AdminLayout = () => {
  const { isAuthenticated, signOut, session, usingDemoCredentials } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-600 text-white' : 'text-ink-300 hover:bg-ink-800 hover:text-white'
    }`;

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900 p-4">
      <Link to="/admin/dashboard" className="mb-6 flex items-center gap-2.5 px-1">
        <img src="/logo.svg" alt="" className="size-9 rounded-lg" width={36} height={36} />
        <span className="leading-tight">
          <span className="block text-sm font-bold text-white">Qalandari Autos</span>
          <span className="block text-[10px] uppercase tracking-widest text-brand-500">Admin panel</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1" aria-label="Admin">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={() => setMenuOpen(false)}>
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-ink-800 pt-4">
        <p className="px-3 text-xs text-ink-400">Signed in as {session?.email}</p>
        <Link to="/" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-300 hover:bg-ink-800 hover:text-white">
          <Store className="size-4" aria-hidden="true" /> View storefront
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-300 hover:bg-ink-800 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-ink-200 bg-white px-4 lg:hidden">
          <button type="button" className="btn-ghost px-2" onClick={() => setMenuOpen(true)} aria-label="Open admin menu">
            <Menu className="size-6" aria-hidden="true" />
          </button>
          <span className="text-base font-bold text-ink-900">Admin panel</span>
        </header>

        {usingDemoCredentials && (
          <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            Prototype sign-in is active (no <code className="font-mono">VITE_ADMIN_*</code> values set). Connect a real
            backend before this dashboard handles live orders for {siteConfig.name}.
          </p>
        )}

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-lg text-ink-300 hover:bg-ink-800"
              onClick={() => setMenuOpen(false)}
              aria-label="Close admin menu"
            >
              <X className="size-6" aria-hidden="true" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
};
