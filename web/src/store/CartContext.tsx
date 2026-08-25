import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { siteConfig } from '../config/site';
import { readStorage, storageKeys, writeStorage } from '../lib/storage';
import { useCatalog } from './CatalogContext';
import type { CartLine, CartLineDetailed } from '../types';

interface CartValue {
  lines: CartLine[];
  items: CartLineDetailed[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  quantityOf: (productId: string) => number;
  /** Rises each time something is added — used to flash the cart button. */
  lastAddedAt: number | null;
}

const CartContext = createContext<CartValue | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { products } = useCatalog();
  const [lines, setLines] = useState<CartLine[]>(() => readStorage<CartLine[]>(storageKeys.cart) ?? []);
  const [lastAddedAt, setLastAddedAt] = useState<number | null>(null);

  useEffect(() => {
    writeStorage(storageKeys.cart, lines);
  }, [lines]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) {
        return current.map((line) =>
          line.productId === productId ? { ...line, quantity: line.quantity + quantity } : line,
        );
      }
      return [...current, { productId, quantity }];
    });
    setLastAddedAt(Date.now());
  }, []);

  const removeItem = useCallback((productId: string) => {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.productId !== productId)
        : current.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const items = useMemo<CartLineDetailed[]>(
    () =>
      lines
        .map((line) => {
          const product = products.find((p) => p.id === line.productId);
          if (!product) return null;
          return { ...line, product, lineTotal: product.price * line.quantity };
        })
        .filter((line): line is CartLineDetailed => line !== null),
    [lines, products],
  );

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = items.length === 0 || subtotal >= siteConfig.freeDeliveryOver ? 0 : siteConfig.deliveryFee;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const quantityOf = useCallback(
    (productId: string) => lines.find((line) => line.productId === productId)?.quantity ?? 0,
    [lines],
  );

  const value = useMemo<CartValue>(
    () => ({
      lines,
      items,
      itemCount,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      quantityOf,
      lastAddedAt,
    }),
    [lines, items, itemCount, subtotal, deliveryFee, addItem, removeItem, setQuantity, clearCart, quantityOf, lastAddedAt],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartValue => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
};
