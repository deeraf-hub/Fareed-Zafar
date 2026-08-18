export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: string[];
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  parent?: { id: string; name: string } | null;
  _count?: { products: number; children: number };
}

export interface Brand {
  id: string;
  name: string;
  isActive: boolean;
  _count?: { products: number };
}

export interface Location {
  id: string;
  name: string;
  code: string;
  type: 'STORE' | 'WAREHOUSE' | 'OUTLET' | 'ONLINE';
  address: string | null;
  city: string | null;
  isActive: boolean;
  isDefault: boolean;
  totalUnits?: number;
  costValue?: number;
  retailValue?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  taxNumber: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  totalPurchases?: number;
  outstandingBalance?: number;
  _count?: { products: number; purchases: number };
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  totalSpent?: number;
  _count?: { sales: number; returns: number };
}

export interface ProductVariant {
  id: string;
  sku: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  style: string | null;
  material: string | null;
  fit: string | null;
  costPrice: number;
  sellingPrice: number;
  minStock: number;
  reorderLevel: number;
  isActive: boolean;
  totalStock?: number;
  damaged?: number;
  stockStatus?: StockStatus;
  stockByLocation?: {
    locationId: string;
    location: { id: string; name: string; code: string };
    quantity: number;
    reserved: number;
    damaged: number;
  }[];
}

export interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  imageUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  costPrice: number;
  sellingPrice: number;
  variantCount: number;
  totalStock: number;
  costValue: number;
  retailValue: number;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryRow {
  inventoryId: string | null;
  variantId: string;
  productId: string;
  productName: string;
  productSku: string;
  variantSku: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  categoryName: string | null;
  supplierName: string | null;
  brandName: string | null;
  locationId: string | null;
  locationName: string | null;
  quantity: number;
  reserved: number;
  damaged: number;
  available: number;
  minStock: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  costValue: number;
  retailValue: number;
  status: StockStatus;
}

export type MovementType =
  | 'PURCHASE' | 'SALE' | 'CUSTOMER_RETURN' | 'SUPPLIER_RETURN' | 'ADJUSTMENT'
  | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'DAMAGED' | 'LOST' | 'OPENING_STOCK'
  | 'STOCK_COUNT' | 'SALE_CANCELLED' | 'PURCHASE_CANCELLED';

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: number;
  previousQty: number;
  newQty: number;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  variant: { id: string; sku: string; size: string | null; color: string | null; product: { id: string; name: string } };
  location: { id: string; name: string };
  user: { id: string; name: string } | null;
}

export type PurchaseStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'EASYPAISA' | 'JAZZCASH' | 'OTHER';

export interface Purchase {
  id: string;
  number: string;
  status: PurchaseStatus;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  notes: string | null;
  supplier: { id: string; name: string; phone?: string | null };
  location: { id: string; name: string };
  createdBy: { id: string; name: string } | null;
  _count?: { items: number };
  items?: PurchaseItem[];
  movements?: StockMovement[];
}

export interface PurchaseItem {
  id: string;
  variantId: string;
  quantity: number;
  receivedQty: number;
  unitCost: number;
  discount: number;
  tax: number;
  total: number;
  variant: {
    id: string; sku: string; size: string | null; color: string | null;
    product: { id: string; name: string };
  };
}

export interface Sale {
  id: string;
  number: string;
  status: SaleStatus;
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes: string | null;
  profit?: number;
  customer: { id: string; name: string; phone?: string | null } | null;
  location: { id: string; name: string };
  createdBy: { id: string; name: string } | null;
  _count?: { items: number };
  items?: SaleItem[];
  movements?: StockMovement[];
}

export interface SaleItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discount: number;
  tax: number;
  total: number;
  profit?: number;
  variant: {
    id: string; sku: string; size: string | null; color: string | null;
    product: { id: string; name: string; imageUrl: string | null };
  };
}

export interface VariantOption {
  id: string;
  sku: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  costPrice: number;
  sellingPrice: number;
  productId: string;
  productName: string;
  imageUrl: string | null;
  taxRate: number;
  stock: number;
  available: number;
}

export interface Notification {
  id: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'STOCK_ADJUSTMENT' | 'PENDING_PURCHASE' | 'PENDING_STOCK_COUNT' | 'SYSTEM';
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  entity: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AppSettings {
  business: {
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    currency: string;
    currencySymbol: string;
  };
  inventory: {
    defaultMinStock: number;
    skuFormat: string;
    autoGenerateSku: boolean;
    autoGenerateBarcode: boolean;
    valuationMethod: 'AVERAGE_COST' | 'LAST_COST';
  };
  notifications: {
    lowStockAlerts: boolean;
    outOfStockAlerts: boolean;
    pendingPurchaseAlerts: boolean;
  };
}
