import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const links = [
  { label: 'Dashboard', to: '/account/dashboard' },
  { label: 'Orders', to: '/account/orders' },
  { label: 'Addresses', to: '/account/addresses' },
  { label: 'Profile', to: '/account/profile' },
  { label: 'Wishlist', to: '/wishlist' },
]

export function AccountLayout() {
  const { isAuthenticated, user, logout } = useAuth()

  if (!isAuthenticated) return <Navigate to="/account/login" replace />

  return (
    <div className="container-lux py-12 sm:py-16">
      <div className="mb-10">
        <span className="eyebrow">My Account</span>
        <h1 className="mt-2 text-3xl text-charcoal sm:text-4xl">Hello, {user?.fullName.split(' ')[0]}</h1>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
        <aside className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2.5 text-sm transition-colors lg:px-0 ${
                  isActive ? 'text-champagne-700' : 'text-charcoal-soft hover:text-charcoal'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={logout}
            className="whitespace-nowrap px-3 py-2.5 text-left text-sm text-charcoal-muted hover:text-charcoal lg:px-0"
          >
            Logout
          </button>
        </aside>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
