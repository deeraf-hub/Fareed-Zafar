import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Address, Customer, Order } from '@/types'
import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage'

/**
 * Demo account layer.
 *
 * Sessions, orders and addresses are held in localStorage so the full customer
 * journey can be exercised in the front end. Swapping these methods for API calls
 * (`POST /api/auth/login`, `GET /api/orders`) is the only change needed for a real
 * backend — no component reads storage directly.
 */

interface AccountContextValue {
  customer: Customer | null
  orders: Order[]
  addresses: Address[]
  isAuthenticated: boolean
  login: (email: string, password: string) => { ok: boolean; error?: string }
  register: (input: {
    fullName: string
    email: string
    password: string
    phone?: string
  }) => { ok: boolean; error?: string }
  logout: () => void
  requestPasswordReset: (email: string) => { ok: boolean; message: string }
  updateProfile: (input: Partial<Pick<Customer, 'fullName' | 'email' | 'phone'>>) => void
  addOrder: (order: Order) => void
  saveAddress: (address: Omit<Address, 'id'> & { id?: string }) => void
  removeAddress: (id: string) => void
  setDefaultAddress: (id: string) => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(() =>
    readStorage<Customer | null>(STORAGE_KEYS.customer, null),
  )
  const [orders, setOrders] = useState<Order[]>(() => readStorage<Order[]>(STORAGE_KEYS.orders, []))
  const [addresses, setAddresses] = useState<Address[]>(() =>
    readStorage<Address[]>(STORAGE_KEYS.addresses, []),
  )

  useEffect(() => writeStorage(STORAGE_KEYS.customer, customer), [customer])
  useEffect(() => writeStorage(STORAGE_KEYS.orders, orders), [orders])
  useEffect(() => writeStorage(STORAGE_KEYS.addresses, addresses), [addresses])

  const register = useCallback<AccountContextValue['register']>(({ fullName, email, password, phone }) => {
    if (!fullName.trim()) return { ok: false, error: 'Please enter your full name.' }
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' }
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
    setCustomer({
      id: createId('cust'),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone,
      createdAt: new Date().toISOString(),
    })
    return { ok: true }
  }, [])

  const login = useCallback<AccountContextValue['login']>((email, password) => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' }
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
    const existing = readStorage<Customer | null>(STORAGE_KEYS.customer, null)
    setCustomer(
      existing && existing.email === email.trim().toLowerCase()
        ? existing
        : {
            id: createId('cust'),
            fullName: email.split('@')[0].replace(/[._-]/g, ' '),
            email: email.trim().toLowerCase(),
            createdAt: new Date().toISOString(),
          },
    )
    return { ok: true }
  }, [])

  const logout = useCallback(() => setCustomer(null), [])

  const requestPasswordReset = useCallback<AccountContextValue['requestPasswordReset']>((email) => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { ok: false, message: 'Please enter a valid email address.' }
    }
    return {
      ok: true,
      message: `If an account exists for ${email}, a reset link is on its way.`,
    }
  }, [])

  const updateProfile = useCallback<AccountContextValue['updateProfile']>((input) => {
    setCustomer((current) => (current ? { ...current, ...input } : current))
  }, [])

  const addOrder = useCallback((order: Order) => {
    setOrders((current) => [order, ...current])
  }, [])

  const saveAddress = useCallback<AccountContextValue['saveAddress']>((address) => {
    setAddresses((current) => {
      const id = address.id ?? createId('addr')
      const next: Address = { ...address, id }
      const exists = current.some((entry) => entry.id === id)
      const merged = exists ? current.map((entry) => (entry.id === id ? next : entry)) : [...current, next]
      return next.isDefault
        ? merged.map((entry) => ({ ...entry, isDefault: entry.id === id }))
        : merged
    })
  }, [])

  const removeAddress = useCallback((id: string) => {
    setAddresses((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const setDefaultAddress = useCallback((id: string) => {
    setAddresses((current) => current.map((entry) => ({ ...entry, isDefault: entry.id === id })))
  }, [])

  const value = useMemo<AccountContextValue>(
    () => ({
      customer,
      orders,
      addresses,
      isAuthenticated: Boolean(customer),
      login,
      register,
      logout,
      requestPasswordReset,
      updateProfile,
      addOrder,
      saveAddress,
      removeAddress,
      setDefaultAddress,
    }),
    [
      customer,
      orders,
      addresses,
      login,
      register,
      logout,
      requestPasswordReset,
      updateProfile,
      addOrder,
      saveAddress,
      removeAddress,
      setDefaultAddress,
    ],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount must be used inside <AccountProvider>')
  return context
}
