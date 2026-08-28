import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { readStorage, writeStorage, STORAGE_KEYS } from '@/lib/storage'

interface WishlistContextValue {
  productIds: string[]
  toggle: (productId: string) => void
  remove: (productId: string) => void
  isWishlisted: (productId: string) => boolean
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>(() => readStorage(STORAGE_KEYS.wishlist, []))

  useEffect(() => {
    writeStorage(STORAGE_KEYS.wishlist, productIds)
  }, [productIds])

  const toggle = (productId: string) => {
    setProductIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
  }

  const remove = (productId: string) => {
    setProductIds((prev) => prev.filter((id) => id !== productId))
  }

  const isWishlisted = (productId: string) => productIds.includes(productId)

  return (
    <WishlistContext.Provider value={{ productIds, toggle, remove, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
