import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Address, AuthUser, Order } from '@/types'
import { readStorage, writeStorage } from '@/lib/storage'

/**
 * Demo-only authentication. Accounts are stored in the browser via
 * localStorage so the account/order/wishlist UI is fully interactive without
 * a backend. Swap this provider for real auth (session cookies / JWT against
 * an API) without touching any component — they only ever call `useAuth()`.
 */

interface StoredUser extends AuthUser {
  password: string
}

const USERS_KEY = 'swabi:users'
const SESSION_KEY = 'swabi:session'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  register: (input: { fullName: string; email: string; phone: string; password: string }) => { ok: boolean; error?: string }
  login: (email: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
  updateProfile: (input: Partial<Pick<AuthUser, 'fullName' | 'phone'>>) => void
  addAddress: (address: Omit<Address, 'id'>) => void
  updateAddress: (id: string, address: Omit<Address, 'id'>) => void
  removeAddress: (id: string) => void
  setDefaultAddress: (id: string) => void
  placeOrder: (order: Omit<Order, 'id' | 'date' | 'status'>) => Order
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadUsers(): StoredUser[] {
  return readStorage<StoredUser[]>(USERS_KEY, [])
}

function saveUsers(users: StoredUser[]) {
  writeStorage(USERS_KEY, users)
}

function toPublicUser(u: StoredUser): AuthUser {
  const { password: _password, ...rest } = u
  return rest
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => readStorage<string | null>(SESSION_KEY, null))
  const [users, setUsers] = useState<StoredUser[]>(() => loadUsers())

  useEffect(() => {
    writeStorage(SESSION_KEY, email)
  }, [email])

  useEffect(() => {
    saveUsers(users)
  }, [users])

  const user = email ? toPublicUser(users.find((u) => u.email === email) as StoredUser) : null

  const register: AuthContextValue['register'] = ({ fullName, email: newEmail, phone, password }) => {
    const normalized = newEmail.trim().toLowerCase()
    if (users.some((u) => u.email === normalized)) {
      return { ok: false, error: 'An account with this email already exists.' }
    }
    const newUser: StoredUser = {
      id: `u-${Date.now()}`,
      fullName,
      email: normalized,
      phone,
      password,
      addresses: [],
      orders: [],
    }
    setUsers((prev) => [...prev, newUser])
    setEmail(normalized)
    return { ok: true }
  }

  const login: AuthContextValue['login'] = (loginEmail, password) => {
    const normalized = loginEmail.trim().toLowerCase()
    const found = users.find((u) => u.email === normalized)
    if (!found || found.password !== password) {
      return { ok: false, error: 'Incorrect email or password.' }
    }
    setEmail(normalized)
    return { ok: true }
  }

  const logout = () => setEmail(null)

  const mutateCurrentUser = (fn: (u: StoredUser) => StoredUser) => {
    if (!email) return
    setUsers((prev) => prev.map((u) => (u.email === email ? fn(u) : u)))
  }

  const updateProfile: AuthContextValue['updateProfile'] = (input) => {
    mutateCurrentUser((u) => ({ ...u, ...input }))
  }

  const addAddress: AuthContextValue['addAddress'] = (address) => {
    mutateCurrentUser((u) => {
      const id = `addr-${Date.now()}`
      const isFirst = u.addresses.length === 0
      return { ...u, addresses: [...u.addresses, { ...address, id, isDefault: isFirst || address.isDefault }] }
    })
  }

  const updateAddress: AuthContextValue['updateAddress'] = (id, address) => {
    mutateCurrentUser((u) => ({
      ...u,
      addresses: u.addresses.map((a) => (a.id === id ? { ...address, id } : a)),
    }))
  }

  const removeAddress: AuthContextValue['removeAddress'] = (id) => {
    mutateCurrentUser((u) => ({ ...u, addresses: u.addresses.filter((a) => a.id !== id) }))
  }

  const setDefaultAddress: AuthContextValue['setDefaultAddress'] = (id) => {
    mutateCurrentUser((u) => ({
      ...u,
      addresses: u.addresses.map((a) => ({ ...a, isDefault: a.id === id })),
    }))
  }

  const placeOrder: AuthContextValue['placeOrder'] = (orderInput) => {
    const order: Order = {
      ...orderInput,
      id: `SW-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString(),
      status: 'Processing',
    }
    mutateCurrentUser((u) => ({ ...u, orders: [order, ...u.orders] }))
    return order
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    register,
    login,
    logout,
    updateProfile,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
    placeOrder,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
