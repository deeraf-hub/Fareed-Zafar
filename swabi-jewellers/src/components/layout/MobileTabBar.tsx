import { NavLink } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { BagIcon, HeartIcon, SearchIcon, UserIcon } from '@/components/ui/icons'

/** Thumb-reachable bottom bar on phones — bag, wishlist and account are one tap away. */
export function MobileTabBar({ onSearch }: { onSearch: () => void }) {
  const { itemCount, openDrawer } = useCart()
  const wishlist = useWishlist()

  const itemClass = 'flex flex-1 flex-col items-center gap-1 py-2 text-[9px] uppercase tracking-wideish'

  return (
    <nav
      aria-label="Quick actions"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-linen bg-ivory/97 backdrop-blur sm:hidden"
    >
      <div className="flex items-stretch">
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `${itemClass} ${isActive ? 'text-champagne-700' : 'text-navy-700'}`
          }
        >
          <BagIcon width={18} height={18} />
          Shop
        </NavLink>
        <button type="button" onClick={onSearch} className={`${itemClass} text-navy-700`}>
          <SearchIcon width={18} height={18} />
          Search
        </button>
        <NavLink
          to="/wishlist"
          className={({ isActive }) =>
            `${itemClass} relative ${isActive ? 'text-champagne-700' : 'text-navy-700'}`
          }
        >
          <span className="relative">
            <HeartIcon width={18} height={18} />
            {wishlist.count > 0 && (
              <span className="absolute -right-2 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-champagne-500 px-1 text-[8px] text-white">
                {wishlist.count}
              </span>
            )}
          </span>
          Saved
        </NavLink>
        <button type="button" onClick={openDrawer} className={`${itemClass} text-navy-700`}>
          <span className="relative">
            <BagIcon width={18} height={18} />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-champagne-500 px-1 text-[8px] text-white">
                {itemCount}
              </span>
            )}
          </span>
          Bag
        </button>
        <NavLink
          to="/account"
          className={({ isActive }) =>
            `${itemClass} ${isActive ? 'text-champagne-700' : 'text-navy-700'}`
          }
        >
          <UserIcon width={18} height={18} />
          Account
        </NavLink>
      </div>
    </nav>
  )
}
