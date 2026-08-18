import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  MapPin,
  Package,
  RotateCcw,
  ScanBarcode,
  Settings,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Truck,
  Users,
  UserSquare2,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  end?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
      { label: 'Scan / lookup', to: '/scan', icon: ScanBarcode, permission: 'inventory:view' },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { label: 'Products', to: '/products', icon: Package, permission: 'product:view', end: true },
      { label: 'Categories', to: '/categories', icon: Tags, permission: 'product:view' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { label: 'Inventory', to: '/inventory', icon: Boxes, permission: 'inventory:view', end: true },
      { label: 'Stock movements', to: '/inventory/movements', icon: FileClock, permission: 'inventory:view' },
      { label: 'Adjustments', to: '/stock-adjustments', icon: SlidersHorizontal, permission: 'inventory:view' },
      { label: 'Transfers', to: '/stock-transfers', icon: ArrowLeftRight, permission: 'inventory:view' },
      { label: 'Stock counts', to: '/stock-count', icon: ClipboardList, permission: 'inventory:view' },
      { label: 'Locations', to: '/locations', icon: MapPin, permission: 'location:view' },
    ],
  },
  {
    title: 'Trade',
    items: [
      { label: 'Purchases', to: '/purchases', icon: ShoppingCart, permission: 'purchase:view', end: true },
      { label: 'Suppliers', to: '/suppliers', icon: Truck, permission: 'supplier:view', end: true },
      { label: 'Sales', to: '/sales', icon: ShoppingBag, permission: 'sale:view', end: true },
      { label: 'Customers', to: '/customers', icon: UserSquare2, permission: 'customer:view' },
      { label: 'Returns', to: '/returns', icon: RotateCcw, permission: 'return:view' },
    ],
  },
  {
    title: 'Insight',
    items: [
      { label: 'Reports', to: '/reports', icon: BarChart3, permission: 'report:view', end: true },
      { label: 'Notifications', to: '/notifications', icon: Bell, permission: 'notification:view' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', to: '/users', icon: Users, permission: 'user:manage' },
      { label: 'Audit log', to: '/audit-logs', icon: FileClock, permission: 'audit:view' },
      { label: 'Settings', to: '/settings', icon: Settings, permission: 'settings:view' },
    ],
  },
];
