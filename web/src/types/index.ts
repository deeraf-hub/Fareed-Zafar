export type CategorySlug =
  | 'engine-parts'
  | 'electrical-parts'
  | 'brake-parts'
  | 'suspension'
  | 'chain-sprocket'
  | 'controls'
  | 'body-parts'
  | 'accessories';

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  description: string;
  image: string;
  createdAt: string;
}

export interface BikeModel {
  id: string;
  /** Full model name as printed on product compatibility lists. */
  name: string;
  slug: string;
  brand: 'Honda' | 'Yamaha' | 'Suzuki' | 'United' | 'Road Prince' | 'Super Power';
  engineCc: number;
  image: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: CategorySlug;
  price: number;
  oldPrice: number | null;
  description: string;
  shortDescription: string;
  image: string;
  images: string[];
  stock: boolean;
  stockQuantity: number;
  compatibleBikes: string[];
  brand: string;
  specifications: ProductSpecification[];
  featured: boolean;
  popular: boolean;
  createdAt: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface CartLineDetailed extends CartLine {
  product: Product;
  lineTotal: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'easypaisa' | 'jazzcash' | 'bank-transfer';

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  area: string;
  postalCode: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  slug: string;
  image: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerDetails;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'popular';

export interface PriceBand {
  id: string;
  label: string;
  min: number;
  max: number | null;
}

export interface ShopFilters {
  query: string;
  categories: CategorySlug[];
  bikes: string[];
  priceBands: string[];
  customMin: number | null;
  customMax: number | null;
  availability: ('in-stock' | 'out-of-stock')[];
  sort: SortKey;
}
