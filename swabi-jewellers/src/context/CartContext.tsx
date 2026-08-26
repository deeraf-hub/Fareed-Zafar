import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CartLine, Product } from '@/types'
import { productsById } from '@/data/products'
import { deliveryFeeFor } from '@/lib/format'
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'

export interface CartEntry extends CartLine {
  product: Product
  lineTotal: number
}

interface PromoCode {
  code: string
  percentOff: number
  minimumSpend: number
}

/** Demo promotions. A discounts service would supply these in production. */
const PROMO_CODES: PromoCode[] = [
  { code: 'SWABI10', percentOff: 10, minimumSpend: 3000 },
  { code: 'BRIDAL5', percentOff: 5, minimumSpend: 6000 },
]

interface CartContextValue {
  lines: CartLine[]
  entries: CartEntry[]
  itemCount: number
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  promo: PromoCode | null
  promoError: string | null
  isDrawerOpen: boolean
  addItem: (productId: string, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  applyPromo: (code: string) => boolean
  removePromo: () => void
  openDrawer: () => void
  closeDrawer: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => readStorage<CartLine[]>(STORAGE_KEYS.cart, []))
  const [promo, setPromo] = useState<PromoCode | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [isDrawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cart, lines)
  }, [lines])

  const entries = useMemo<CartEntry[]>(
    () =>
      lines
        .map((line) => {
          const product = productsById.get(line.productId)
          if (!product) return null
          return { ...line, product, lineTotal: product.price * line.quantity }
        })
        .filter((entry): entry is CartEntry => entry !== null),
    [lines],
  )

  const subtotal = useMemo(() => entries.reduce((sum, entry) => sum + entry.lineTotal, 0), [entries])
  const itemCount = useMemo(() => entries.reduce((sum, entry) => sum + entry.quantity, 0), [entries])

  const discount = useMemo(() => {
    if (!promo || subtotal < promo.minimumSpend) return 0
    return Math.round((subtotal * promo.percentOff) / 100)
  }, [promo, subtotal])

  const deliveryFee = useMemo(() => deliveryFeeFor(subtotal - discount), [subtotal, discount])
  const total = Math.max(0, subtotal - discount + deliveryFee)

  const addItem = useCallback((productId: string, quantity = 1) => {
    const product = productsById.get(productId)
    if (!product) return
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId)
      if (!existing) return [...current, { productId, quantity: Math.min(quantity, product.stock) }]
      return current.map((line) =>
        line.productId === productId
          ? { ...line, quantity: Math.min(line.quantity + quantity, product.stock) }
          : line,
      )
    })
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const product = productsById.get(productId)
    const capped = Math.max(1, Math.min(quantity, product?.stock ?? quantity))
    setLines((current) =>
      current.map((line) => (line.productId === productId ? { ...line, quantity: capped } : line)),
    )
  }, [])

  const removeItem = useCallback((productId: string) => {
    setLines((current) => current.filter((line) => line.productId !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setLines([])
    setPromo(null)
    setPromoError(null)
  }, [])

  const applyPromo = useCallback(
    (code: string) => {
      const match = PROMO_CODES.find((entry) => entry.code === code.trim().toUpperCase())
      if (!match) {
        setPromoError('That code is not recognised.')
        return false
      }
      if (subtotal < match.minimumSpend) {
        setPromoError(`This code applies to orders above Rs. ${match.minimumSpend.toLocaleString()}.`)
        return false
      }
      setPromo(match)
      setPromoError(null)
      return true
    },
    [subtotal],
  )

  const removePromo = useCallback(() => {
    setPromo(null)
    setPromoError(null)
  }, [])

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      entries,
      itemCount,
      subtotal,
      discount,
      deliveryFee,
      total,
      promo,
      promoError,
      isDrawerOpen,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      applyPromo,
      removePromo,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
    }),
    [
      lines,
      entries,
      itemCount,
      subtotal,
      discount,
      deliveryFee,
      total,
      promo,
      promoError,
      isDrawerOpen,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      applyPromo,
      removePromo,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside <CartProvider>')
  return context
}
