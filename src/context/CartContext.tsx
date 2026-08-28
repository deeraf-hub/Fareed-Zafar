import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartLine } from '@/types'
import { getProductBySlug, products } from '@/data/products'
import { readStorage, writeStorage, STORAGE_KEYS } from '@/lib/storage'
import { siteConfig } from '@/config/site'

interface CartContextValue {
  lines: CartLine[]
  itemCount: number
  subtotal: number
  deliveryFee: number
  total: number
  addItem: (productId: string, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  isInCart: (productId: string) => boolean
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => readStorage(STORAGE_KEYS.cart, []))

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cart, lines)
  }, [lines])

  const addItem = (productId: string, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId)
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l))
      }
      return [...prev, { productId, quantity }]
    })
  }

  const removeItem = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)))
  }

  const clearCart = () => setLines([])

  const isInCart = (productId: string) => lines.some((l) => l.productId === productId)

  const { itemCount, subtotal } = useMemo(() => {
    let count = 0
    let sub = 0
    for (const line of lines) {
      const product = products.find((p) => p.id === line.productId) ?? getProductBySlug(line.productId)
      if (!product) continue
      count += line.quantity
      sub += product.price * line.quantity
    }
    return { itemCount: count, subtotal: sub }
  }, [lines])

  const deliveryFee = subtotal === 0 || subtotal >= siteConfig.freeDeliveryThreshold ? 0 : siteConfig.standardDeliveryFee
  const total = subtotal + deliveryFee

  const value: CartContextValue = {
    lines,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
