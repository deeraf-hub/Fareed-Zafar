import { prisma } from '../db.js';

export interface BusinessSettings {
  name: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  currencySymbol: string;
}

export interface InventorySettings {
  defaultMinStock: number;
  skuFormat: string;
  autoGenerateSku: boolean;
  autoGenerateBarcode: boolean;
  valuationMethod: 'AVERAGE_COST' | 'LAST_COST';
}

export interface NotificationSettings {
  lowStockAlerts: boolean;
  outOfStockAlerts: boolean;
  pendingPurchaseAlerts: boolean;
}

export interface AppSettings {
  business: BusinessSettings;
  inventory: InventorySettings;
  notifications: NotificationSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  business: {
    name: 'Brandsloop',
    logoUrl: null,
    phone: null,
    email: null,
    address: null,
    currency: 'PKR',
    currencySymbol: 'Rs',
  },
  inventory: {
    defaultMinStock: 5,
    // Tokens: {CAT} category code, {COLOR}, {SIZE}, {SEQ} zero-padded counter.
    skuFormat: '{CAT}-{COLOR}-{SIZE}-{SEQ}',
    autoGenerateSku: true,
    autoGenerateBarcode: true,
    valuationMethod: 'AVERAGE_COST',
  },
  notifications: {
    lowStockAlerts: true,
    outOfStockAlerts: true,
    pendingPurchaseAlerts: true,
  },
};

const SETTINGS_KEY = 'app';

export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return DEFAULT_SETTINGS;
  const stored = row.value as Partial<AppSettings>;
  return {
    business: { ...DEFAULT_SETTINGS.business, ...(stored.business ?? {}) },
    inventory: { ...DEFAULT_SETTINGS.inventory, ...(stored.inventory ?? {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(stored.notifications ?? {}) },
  };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged: AppSettings = {
    business: { ...current.business, ...(patch.business ?? {}) },
    inventory: { ...current.inventory, ...(patch.inventory ?? {}) },
    notifications: { ...current.notifications, ...(patch.notifications ?? {}) },
  };
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: merged as unknown as object },
    update: { value: merged as unknown as object },
  });
  return merged;
}
