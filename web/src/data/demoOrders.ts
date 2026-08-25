import { siteConfig } from '../config/site';
import { products } from './products';
import type { Order, OrderItem, OrderStatus, PaymentMethod } from '../types';

const bySku = (sku: string) => {
  const product = products.find((p) => p.sku === sku);
  if (!product) throw new Error(`Demo order references unknown SKU: ${sku}`);
  return product;
};

const line = (sku: string, quantity: number): OrderItem => {
  const product = bySku(sku);
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    image: product.image,
    quantity,
    unitPrice: product.price,
    total: product.price * quantity,
  };
};

interface DemoSpec {
  orderNumber: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  area: string;
  postalCode: string;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
}

const specs: DemoSpec[] = [
  {
    orderNumber: `${siteConfig.orderNumberPrefix}10001`,
    name: 'Demo Customer — Bilal Ahmed',
    phone: '0300 0000001',
    email: 'demo1@example.com',
    address: 'House 12, Street 4, Gulberg III',
    city: 'Lahore',
    area: 'Gulberg',
    postalCode: '54000',
    items: [line('QAS-BRK-002', 1), line('QAS-ENG-001', 2)],
    paymentMethod: 'cod',
    status: 'pending',
    createdAt: '2026-08-22T09:20:00.000Z',
  },
  {
    orderNumber: `${siteConfig.orderNumberPrefix}10002`,
    name: 'Demo Customer — Hassan Workshop',
    phone: '0301 0000002',
    email: 'demo2@example.com',
    address: 'Shop 7, Bike Market, Ravi Road',
    city: 'Lahore',
    area: 'Ravi Road',
    postalCode: '54500',
    items: [line('QAS-CHN-001', 2), line('QAS-ENG-012', 4)],
    paymentMethod: 'cod',
    status: 'processing',
    createdAt: '2026-08-21T11:05:00.000Z',
  },
  {
    orderNumber: `${siteConfig.orderNumberPrefix}10003`,
    name: 'Demo Customer — Usman Riaz',
    phone: '0333 0000003',
    email: 'demo3@example.com',
    address: 'Flat 3B, Askari 5',
    city: 'Rawalpindi',
    area: 'Askari 5',
    postalCode: '46000',
    items: [line('QAS-ELE-001', 1)],
    paymentMethod: 'cod',
    status: 'shipped',
    createdAt: '2026-08-19T15:40:00.000Z',
  },
  {
    orderNumber: `${siteConfig.orderNumberPrefix}10004`,
    name: 'Demo Customer — Ayesha Khan',
    phone: '0321 0000004',
    email: 'demo4@example.com',
    address: 'House 45, Block C, Model Town',
    city: 'Faisalabad',
    area: 'Model Town',
    postalCode: '38000',
    items: [line('QAS-BDY-001', 1), line('QAS-ACC-003', 1), line('QAS-ACC-005', 2)],
    paymentMethod: 'cod',
    status: 'delivered',
    createdAt: '2026-08-14T08:10:00.000Z',
  },
  {
    orderNumber: `${siteConfig.orderNumberPrefix}10005`,
    name: 'Demo Customer — Rider Express',
    phone: '0345 0000005',
    email: 'demo5@example.com',
    address: 'Office 2, Main Boulevard',
    city: 'Karachi',
    area: 'Gulshan-e-Iqbal',
    postalCode: '75300',
    items: [line('QAS-SUS-001', 1)],
    paymentMethod: 'cod',
    status: 'cancelled',
    createdAt: '2026-08-12T17:25:00.000Z',
  },
  {
    orderNumber: `${siteConfig.orderNumberPrefix}10006`,
    name: 'Demo Customer — Bilal Ahmed',
    phone: '0300 0000001',
    email: 'demo1@example.com',
    address: 'House 12, Street 4, Gulberg III',
    city: 'Lahore',
    area: 'Gulberg',
    postalCode: '54000',
    items: [line('QAS-CTL-004', 1), line('QAS-ELE-003', 2)],
    paymentMethod: 'cod',
    status: 'confirmed',
    createdAt: '2026-08-24T13:00:00.000Z',
  },
];

const toOrder = (spec: DemoSpec, index: number): Order => {
  const subtotal = spec.items.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = spec.status === 'cancelled' ? 0 : subtotal >= siteConfig.freeDeliveryOver ? 0 : siteConfig.deliveryFee;
  return {
    id: `demo-order-${index + 1}`,
    orderNumber: spec.orderNumber,
    customer: {
      name: spec.name,
      phone: spec.phone,
      email: spec.email,
      address: spec.address,
      city: spec.city,
      area: spec.area,
      postalCode: spec.postalCode,
    },
    items: spec.items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    paymentMethod: spec.paymentMethod,
    status: spec.status,
    createdAt: spec.createdAt,
    updatedAt: spec.createdAt,
    isDemo: true,
  };
};

/** Clearly marked demo orders so the admin dashboard can be tested. */
export const demoOrders: Order[] = specs.map(toOrder);
