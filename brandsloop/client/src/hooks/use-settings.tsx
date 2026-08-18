import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { setCurrencySymbol } from '@/lib/utils';
import type { AppSettings } from '@/types';
import { useAuth } from './use-auth';

const FALLBACK: AppSettings = {
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
    skuFormat: '{CAT}-{COLOR}-{SIZE}-{SEQ}',
    autoGenerateSku: true,
    autoGenerateBarcode: true,
    valuationMethod: 'AVERAGE_COST',
  },
  notifications: { lowStockAlerts: true, outOfStockAlerts: true, pendingPurchaseAlerts: true },
};

export function useSettings(): AppSettings {
  const { user, can } = useAuth();
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: AppSettings }>('/settings').then((r) => r.data),
    enabled: Boolean(user) && can('settings:view'),
    staleTime: 5 * 60 * 1000,
  });

  const settings = data ?? FALLBACK;

  // Keep the shared money formatter in step with the configured currency.
  React.useEffect(() => {
    setCurrencySymbol(settings.business.currencySymbol || 'Rs');
  }, [settings.business.currencySymbol]);

  return settings;
}
