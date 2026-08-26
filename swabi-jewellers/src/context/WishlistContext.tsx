import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'

interface WishlistContextValue {
  ids: string[]
  count: number
  has: (productId: string) => boolean
  toggle: (productId: string) => boolean
  remove: (productId: string) => void
  clear: () => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => readStorage<string[]>(STORAGE_KEYS.wishlist, []))

  useEffect(() => {
    writeStorage(STORAGE_KEYS.wishlist, ids)
  }, [ids])

  const has = useCallback((productId: string) => ids.includes(productId), [ids])

  /** Returns the new membership state so callers can show the right toast. */
  const toggle = useCallback(
    (productId: string) => {
      const nowSaved = !ids.includes(productId)
      setIds((current) =>
        nowSaved ? [...current, productId] : current.filter((id) => id !== productId),
      )
      return nowSaved
    },
    [ids],
  )

  const remove = useCallback((productId: string) => {
    setIds((current) => current.filter((id) => id !== productId))
  }, [])

  const value = useMemo<WishlistContextValue>(
    () => ({ ids, count: ids.length, has, toggle, remove, clear: () => setIds([]) }),
    [ids, has, toggle, remove],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used inside <WishlistProvider>')
  return context
}
