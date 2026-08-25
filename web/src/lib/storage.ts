/**
 * localStorage helpers that never throw — private browsing and storage-blocked
 * browsers return null instead of breaking the page.
 */
export const readStorage = <T,>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const writeStorage = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — state stays in memory for this session */
  }
};

export const removeStorage = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const storageKeys = {
  cart: 'qas.cart.v1',
  orders: 'qas.orders.v1',
  catalog: 'qas.catalog.v1',
  admin: 'qas.admin-session.v1',
  recentlyViewed: 'qas.recently-viewed.v1',
} as const;
