/** localStorage helpers that never throw — private mode and quota errors are ignored. */

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — the session simply will not persist */
  }
}

export const STORAGE_KEYS = {
  cart: 'swabi:cart',
  wishlist: 'swabi:wishlist',
  customer: 'swabi:customer',
  orders: 'swabi:orders',
  addresses: 'swabi:addresses',
  recentSearches: 'swabi:recent-searches',
} as const
