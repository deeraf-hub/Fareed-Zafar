import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Building2, Package, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { AppSettings } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { renderSkuPreview } from '@/lib/sku-preview';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const canManage = can('settings:manage');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: AppSettings }>('/settings').then((r) => r.data),
  });

  const [form, setForm] = React.useState<AppSettings | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (payload: AppSettings) => api.put('/settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
      setFormError(null);
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not save the settings.';
      setFormError(message);
      toast.error('Could not save the settings', message);
    },
  });

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !form) {
    return <div className="space-y-4"><Skeleton className="h-8 w-52" /><Skeleton className="h-72 w-full" /></div>;
  }

  const setBusiness = (patch: Partial<AppSettings['business']>) =>
    setForm((current) => (current ? { ...current, business: { ...current.business, ...patch } } : current));
  const setInventory = (patch: Partial<AppSettings['inventory']>) =>
    setForm((current) => (current ? { ...current, inventory: { ...current.inventory, ...patch } } : current));
  const setNotifications = (patch: Partial<AppSettings['notifications']>) =>
    setForm((current) => (current ? { ...current, notifications: { ...current.notifications, ...patch } } : current));

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business details, inventory defaults and alerts."
        breadcrumbs={[{ label: 'Settings' }]}
        actions={
          canManage ? (
            <Button onClick={() => save.mutate(form)} loading={save.isPending}>
              <Save className="h-4 w-4" />
              Save changes
            </Button>
          ) : null
        }
      />

      {!canManage ? (
        <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          You can view these settings but only an administrator can change them.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Business</CardTitle>
            <CardDescription>Shown across the app and on exports.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="businessName" required>Business name</Label>
              <Input id="businessName" disabled={!canManage} value={form.business.name} onChange={(event) => setBusiness({ name: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessPhone">Phone</Label>
              <Input id="businessPhone" disabled={!canManage} value={form.business.phone ?? ''} onChange={(event) => setBusiness({ phone: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessEmail">Email</Label>
              <Input id="businessEmail" type="email" disabled={!canManage} value={form.business.email ?? ''} onChange={(event) => setBusiness({ email: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="businessAddress">Address</Label>
              <Textarea id="businessAddress" rows={2} disabled={!canManage} value={form.business.address ?? ''} onChange={(event) => setBusiness({ address: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="businessLogo">Logo URL</Label>
              <Input id="businessLogo" disabled={!canManage} value={form.business.logoUrl ?? ''} onChange={(event) => setBusiness({ logoUrl: event.target.value })} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency code</Label>
              <Input id="currency" disabled={!canManage} value={form.business.currency} onChange={(event) => setBusiness({ currency: event.target.value.toUpperCase() })} maxLength={8} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currencySymbol">Currency symbol</Label>
              <Input id="currencySymbol" disabled={!canManage} value={form.business.currencySymbol} onChange={(event) => setBusiness({ currencySymbol: event.target.value })} maxLength={8} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" />Inventory</CardTitle>
            <CardDescription>Defaults applied to new products and variants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="defaultMinStock">Default minimum stock</Label>
              <Input
                id="defaultMinStock"
                type="number"
                min="0"
                disabled={!canManage}
                value={form.inventory.defaultMinStock}
                onChange={(event) => setInventory({ defaultMinStock: Number(event.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Used when a product does not set its own.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="skuFormat">SKU format</Label>
              <Input
                id="skuFormat"
                disabled={!canManage}
                value={form.inventory.skuFormat}
                onChange={(event) => setInventory({ skuFormat: event.target.value })}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Tokens: <code>{'{CAT}'}</code> category, <code>{'{PROD}'}</code> product, <code>{'{BRAND}'}</code> brand,{' '}
                <code>{'{COLOR}'}</code>, <code>{'{SIZE}'}</code>, <code>{'{SEQ}'}</code> counter. Must include{' '}
                <code>{'{SEQ}'}</code>.
              </p>
              <p className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-sm">
                Preview: {renderSkuPreview(form.inventory.skuFormat)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valuationMethod">Stock valuation method</Label>
              <Select
                id="valuationMethod"
                disabled={!canManage}
                value={form.inventory.valuationMethod}
                onChange={(event) => setInventory({ valuationMethod: event.target.value as AppSettings['inventory']['valuationMethod'] })}
              >
                <option value="AVERAGE_COST">Average cost</option>
                <option value="LAST_COST">Last purchase cost</option>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canManage}
                checked={form.inventory.autoGenerateSku}
                onChange={(event) => setInventory({ autoGenerateSku: event.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Generate SKUs automatically when left blank
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canManage}
                checked={form.inventory.autoGenerateBarcode}
                onChange={(event) => setInventory({ autoGenerateBarcode: event.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Generate EAN-13 barcodes for new variants
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" />Notifications</CardTitle>
            <CardDescription>Which alerts appear in the bell menu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canManage}
                checked={form.notifications.lowStockAlerts}
                onChange={(event) => setNotifications({ lowStockAlerts: event.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Low stock alerts
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canManage}
                checked={form.notifications.outOfStockAlerts}
                onChange={(event) => setNotifications({ outOfStockAlerts: event.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Out of stock alerts
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canManage}
                checked={form.notifications.pendingPurchaseAlerts}
                onChange={(event) => setNotifications({ pendingPurchaseAlerts: event.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Pending purchase reminders
            </label>
          </CardContent>
        </Card>
      </div>

      {formError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>
      ) : null}

      {canManage ? (
        <div className="mt-5 flex justify-end">
          <Button onClick={() => save.mutate(form)} loading={save.isPending}>
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      ) : null}
    </>
  );
}
