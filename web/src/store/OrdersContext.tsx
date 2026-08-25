import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { siteConfig } from '../config/site';
import { demoOrders } from '../data/demoOrders';
import { readStorage, storageKeys, writeStorage } from '../lib/storage';
import type { CartLineDetailed, CustomerDetails, Order, OrderStatus, PaymentMethod } from '../types';

/**
 * Order book for the prototype: seeded with clearly marked demo orders and
 * persisted locally. When a backend is connected, `placeOrder` becomes an API
 * call and the server — not the browser — recalculates the totals.
 */
interface OrdersValue {
  orders: Order[];
  loading: boolean;
  placeOrder: (input: {
    customer: CustomerDetails;
    items: CartLineDetailed[];
    paymentMethod: PaymentMethod;
  }) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  findOrder: (orderNumber: string, phone: string) => Order | undefined;
  getOrderByNumber: (orderNumber: string) => Order | undefined;
}

const OrdersContext = createContext<OrdersValue | null>(null);

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const nextOrderNumber = (orders: Order[]): string => {
  const highest = orders.reduce((max, order) => {
    const numeric = Number.parseInt(order.orderNumber.replace(/\D/g, ''), 10);
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 10000);
  return `${siteConfig.orderNumberPrefix}${highest + 1}`;
};

export const OrdersProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [loading, setLoading] = useState(true);
  const ordersRef = useRef<Order[]>(orders);
  ordersRef.current = orders;

  useEffect(() => {
    const stored = readStorage<Order[]>(storageKeys.orders);
    if (stored?.length) setOrders(stored);
    const timer = window.setTimeout(() => setLoading(false), 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    writeStorage(storageKeys.orders, orders);
  }, [orders, loading]);

  const placeOrder: OrdersValue['placeOrder'] = useCallback(({ customer, items, paymentMethod }) => {
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const deliveryFee = subtotal >= siteConfig.freeDeliveryOver ? 0 : siteConfig.deliveryFee;
    const now = new Date().toISOString();

    const order: Order = {
      id: `order-${Date.now().toString(36)}`,
      orderNumber: nextOrderNumber(ordersRef.current),
      customer,
      items: items.map((item) => ({
        productId: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.image,
        fallbackImage: item.product.fallbackImage,
        quantity: item.quantity,
        unitPrice: item.product.price,
        total: item.product.price * item.quantity,
      })),
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      paymentMethod,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    setOrders((current) => [order, ...current]);
    return order;
  }, []);

  const updateOrderStatus: OrdersValue['updateOrderStatus'] = useCallback((id, status) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, status, updatedAt: new Date().toISOString() } : order,
      ),
    );
  }, []);

  const getOrderByNumber = useCallback(
    (orderNumber: string) =>
      orders.find((order) => order.orderNumber.toLowerCase() === orderNumber.trim().toLowerCase()),
    [orders],
  );

  const findOrder = useCallback(
    (orderNumber: string, phone: string) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) return undefined;
      const entered = digitsOnly(phone).slice(-10);
      const stored = digitsOnly(order.customer.phone).slice(-10);
      return entered && entered === stored ? order : undefined;
    },
    [getOrderByNumber],
  );

  const value = useMemo<OrdersValue>(
    () => ({ orders, loading, placeOrder, updateOrderStatus, findOrder, getOrderByNumber }),
    [orders, loading, placeOrder, updateOrderStatus, findOrder, getOrderByNumber],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
};

export const useOrders = (): OrdersValue => {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders must be used inside OrdersProvider');
  return context;
};
