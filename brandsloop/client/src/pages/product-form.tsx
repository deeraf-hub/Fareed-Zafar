import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { api, ApiError, type ListResponse } from '@/lib/api';
import type { Brand, Category, Supplier } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/states';
import { useSettings } from '@/hooks/use-settings';

interface VariantDraft {
  id?: string;
  key: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  style: string;
  material: string;
  fit: string;
  costPrice: string;
  sellingPrice: string;
  minStock: string;
  reorderLevel: string;
  isActive: boolean;
}

const emptyVariant = (): VariantDraft => ({
  key: Math.random().toString(36).slice(2),
  sku: '', barcode: '', size: '', color: '', style: '', material: '', fit: '',
  costPrice: '', sellingPrice: '', minStock: '', reorderLevel: '', isActive: true,
});

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40'];
const COMMON_COLORS = ['Black', 'White', 'Navy', 'Blue', 'Grey', 'Beige', 'Olive', 'Maroon', 'Brown', 'Charcoal'];

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const settings = useSettings();

  const [form, setForm] = React.useState({
    name: '', sku: '', barcode: '', description: '', categoryId: '', brandId: '', supplierId: '',
    imageUrl: '', costPrice: '', sellingPrice: '', wholesalePrice: '', taxRate: '0',
    minStock: '', maxStock: '', reorderLevel: '', status: 'ACTIVE',
  });
  const [variants, setVariants] = React.useState<VariantDraft[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [bulk, setBulk] = React.useState({ colors: '', sizes: '' });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ data: Category[] }>('/categories', { includeInactive: true }).then((r) => r.data),
  });
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get<{ data: Brand[] }>('/brands').then((r) => r.data),
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.get<ListResponse<Supplier>>('/suppliers', { pageSize: 200 }).then((r) => r.data),
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<{ data: any }>(`/products/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  React.useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name ?? '',
      sku: existing.sku ?? '',
      barcode: existing.barcode ?? '',
      description: existing.description ?? '',
      categoryId: existing.categoryId ?? '',
      brandId: existing.brandId ?? '',
      supplierId: existing.supplierId ?? '',
      imageUrl: existing.imageUrl ?? '',
      costPrice: String(existing.costPrice ?? ''),
      sellingPrice: String(existing.sellingPrice ?? ''),
      wholesalePrice: existing.wholesalePrice == null ? '' : String(existing.wholesalePrice),
      taxRate: String(existing.taxRate ?? 0),
      minStock: String(existing.minStock ?? ''),
      maxStock: existing.maxStock == null ? '' : String(existing.maxStock),
      reorderLevel: String(existing.reorderLevel ?? ''),
      status: existing.status ?? 'ACTIVE',
    });
    setVariants(
      (existing.variants ?? []).map((variant: any) => ({
        id: variant.id,
        key: variant.id,
        sku: variant.sku ?? '',
        barcode: variant.barcode ?? '',
        size: variant.size ?? '',
        color: variant.color ?? '',
        style: variant.style ?? '',
        material: variant.material ?? '',
        fit: variant.fit ?? '',
        costPrice: String(variant.costPrice ?? ''),
        sellingPrice: String(variant.sellingPrice ?? ''),
        minStock: String(variant.minStock ?? ''),
        reorderLevel: String(variant.reorderLevel ?? ''),
        isActive: variant.isActive ?? true,
      })),
    );
  }, [existing]);

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const setVariant = (key: string, patch: Partial<VariantDraft>) => {
    setVariants((current) => current.map((variant) => (variant.key === key ? { ...variant, ...patch } : variant)));
  };

  /** Builds one variant per colour x size combination, skipping duplicates. */
  const generateMatrix = () => {
    const colors = bulk.colors.split(',').map((value) => value.trim()).filter(Boolean);
    const sizes = bulk.sizes.split(',').map((value) => value.trim()).filter(Boolean);
    if (colors.length === 0 && sizes.length === 0) {
      toast.error('Nothing to generate', 'Enter at least one colour or size.');
      return;
    }
    const colorList = colors.length > 0 ? colors : [''];
    const sizeList = sizes.length > 0 ? sizes : [''];
    const existingKeys = new Set(
      variants.map((variant) => `${variant.color.toLowerCase()}|${variant.size.toLowerCase()}`),
    );

    const additions: VariantDraft[] = [];
    for (const color of colorList) {
      for (const size of sizeList) {
        const key = `${color.toLowerCase()}|${size.toLowerCase()}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        additions.push({
          ...emptyVariant(),
          color,
          size,
          costPrice: form.costPrice,
          sellingPrice: form.sellingPrice,
          minStock: form.minStock,
          reorderLevel: form.reorderLevel,
        });
      }
    }
    if (additions.length === 0) {
      toast.error('Nothing added', 'Those combinations already exist.');
      return;
    }
    setVariants((current) => [...current, ...additions]);
    setBulk({ colors: '', sizes: '' });
    toast.success(`${additions.length} variant${additions.length === 1 ? '' : 's'} added`);
  };

  const generateSku = async (variantKey?: string) => {
    const variant = variantKey ? variants.find((item) => item.key === variantKey) : undefined;
    try {
      const response = await api.post<{ data: { sku: string } }>('/products/generate-sku', {
        productName: form.name,
        categoryId: form.categoryId || undefined,
        color: variant?.color || undefined,
        size: variant?.size || undefined,
      });
      if (variant) setVariant(variant.key, { sku: response.data.sku });
      else set('sku', response.data.sku);
    } catch (err) {
      toast.error('Could not generate an SKU', (err as Error).message);
    }
  };

  const save = useMutation({
    mutationFn: (payload: unknown) =>
      isEdit ? api.put(`/products/${id}`, payload) : api.post('/products', payload),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(isEdit ? 'Product updated' : 'Product created', `${form.name} has been saved.`);
      navigate(`/products/${response.data.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.details) {
        setErrors(Object.fromEntries(err.details.map((detail) => [detail.field, detail.message])));
      }
      toast.error(isEdit ? 'Could not update the product' : 'Could not create the product', (err as Error).message);
    },
  });

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Enter a product name.';
    if (form.sellingPrice && Number(form.sellingPrice) < 0) next.sellingPrice = 'Price cannot be negative.';
    if (
      form.costPrice && form.sellingPrice &&
      Number(form.sellingPrice) > 0 && Number(form.sellingPrice) < Number(form.costPrice)
    ) {
      next.sellingPrice = 'Selling price is below cost — check this is intentional.';
    }
    setErrors(next);
    // The price warning is advisory, so only a missing name blocks saving.
    return !next.name;
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    save.mutate({
      name: form.name,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      description: form.description || undefined,
      categoryId: form.categoryId || null,
      brandId: form.brandId || null,
      supplierId: form.supplierId || null,
      imageUrl: form.imageUrl || undefined,
      costPrice: Number(form.costPrice || 0),
      sellingPrice: Number(form.sellingPrice || 0),
      wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : undefined,
      taxRate: Number(form.taxRate || 0),
      minStock: Number(form.minStock || 0),
      maxStock: form.maxStock ? Number(form.maxStock) : undefined,
      reorderLevel: Number(form.reorderLevel || 0),
      status: form.status,
      variants: variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku || undefined,
        barcode: variant.barcode || undefined,
        size: variant.size || undefined,
        color: variant.color || undefined,
        style: variant.style || undefined,
        material: variant.material || undefined,
        fit: variant.fit || undefined,
        costPrice: Number(variant.costPrice || form.costPrice || 0),
        sellingPrice: Number(variant.sellingPrice || form.sellingPrice || 0),
        minStock: Number(variant.minStock || 0),
        reorderLevel: Number(variant.reorderLevel || 0),
        isActive: variant.isActive,
      })),
    });
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? `Edit ${existing?.name ?? 'product'}` : 'New product'}
        description="Products hold shared details; each variant carries its own SKU, price and stock."
        breadcrumbs={[
          { label: 'Products', to: '/products' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link to={isEdit ? `/products/${id}` : '/products'}>Cancel</Link>
            </Button>
            <Button type="submit" loading={save.isPending}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" required>Product name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  placeholder="e.g. Basic T-Shirt"
                />
                {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sku">Product SKU</Label>
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(event) => set('sku', event.target.value)}
                    placeholder={settings.inventory.autoGenerateSku ? 'Generated automatically' : 'e.g. TSH-001'}
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => generateSku()} aria-label="Generate SKU">
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(event) => set('barcode', event.target.value)}
                  placeholder="Optional"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="categoryId">Category</Label>
                <Select id="categoryId" value={form.categoryId} onChange={(event) => set('categoryId', event.target.value)}>
                  <option value="">No category</option>
                  {categories?.filter((c) => !c.parentId).map((parent) => (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={parent.id}>{parent.name} (all)</option>
                      {categories.filter((c) => c.parentId === parent.id).map((child) => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brandId">Brand</Label>
                <Select id="brandId" value={form.brandId} onChange={(event) => set('brandId', event.target.value)}>
                  <option value="">No brand</option>
                  {brands?.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supplierId">Supplier</Label>
                <Select id="supplierId" value={form.supplierId} onChange={(event) => set('supplierId', event.target.value)}>
                  <option value="">No supplier</option>
                  {suppliers?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select id="status" value={form.status} onChange={(event) => set('status', event.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="DISCONTINUED">Discontinued</option>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={form.imageUrl}
                  onChange={(event) => set('imageUrl', event.target.value)}
                  placeholder="https://…"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => set('description', event.target.value)}
                  placeholder="Fabric, fit, care instructions…"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>
                Stock is tracked per variant. Leave the SKU blank and one is generated for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="mb-2 text-sm font-medium">Generate a size × colour matrix</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={bulk.colors}
                    onChange={(event) => setBulk((current) => ({ ...current, colors: event.target.value }))}
                    placeholder="Colours: Black, White, Navy"
                    list="common-colors"
                  />
                  <Input
                    value={bulk.sizes}
                    onChange={(event) => setBulk((current) => ({ ...current, sizes: event.target.value }))}
                    placeholder="Sizes: S, M, L, XL"
                    list="common-sizes"
                  />
                  <Button type="button" variant="secondary" onClick={generateMatrix}>
                    <Wand2 className="h-4 w-4" />
                    Generate
                  </Button>
                </div>
                <datalist id="common-colors">
                  {COMMON_COLORS.map((color) => <option key={color} value={color} />)}
                </datalist>
                <datalist id="common-sizes">
                  {COMMON_SIZES.map((size) => <option key={size} value={size} />)}
                </datalist>
              </div>

              {variants.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No variants yet. Generate a matrix above, or add one manually.
                </p>
              ) : (
                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div key={variant.key} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium">
                          Variant {index + 1}
                          {variant.color || variant.size ? (
                            <span className="ml-2 text-muted-foreground">
                              {[variant.color, variant.size].filter(Boolean).join(' / ')}
                            </span>
                          ) : null}
                        </p>
                        <div className="flex items-center gap-1">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={variant.isActive}
                              onChange={(event) => setVariant(variant.key, { isActive: event.target.checked })}
                              className="h-3.5 w-3.5 rounded border-input"
                            />
                            Active
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setVariants((current) => current.filter((item) => item.key !== variant.key))}
                            aria-label={`Remove variant ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <Input
                          value={variant.color}
                          onChange={(event) => setVariant(variant.key, { color: event.target.value })}
                          placeholder="Colour"
                          list="common-colors"
                          aria-label="Colour"
                        />
                        <Input
                          value={variant.size}
                          onChange={(event) => setVariant(variant.key, { size: event.target.value })}
                          placeholder="Size"
                          list="common-sizes"
                          aria-label="Size"
                        />
                        <div className="flex gap-1.5 lg:col-span-2">
                          <Input
                            value={variant.sku}
                            onChange={(event) => setVariant(variant.key, { sku: event.target.value })}
                            placeholder="SKU (auto)"
                            className="font-mono text-xs"
                            aria-label="SKU"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => generateSku(variant.key)}
                            aria-label="Generate variant SKU"
                          >
                            <Wand2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={variant.barcode}
                          onChange={(event) => setVariant(variant.key, { barcode: event.target.value })}
                          placeholder="Barcode (auto)"
                          className="font-mono text-xs"
                          aria-label="Barcode"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.costPrice}
                          onChange={(event) => setVariant(variant.key, { costPrice: event.target.value })}
                          placeholder="Cost price"
                          aria-label="Cost price"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.sellingPrice}
                          onChange={(event) => setVariant(variant.key, { sellingPrice: event.target.value })}
                          placeholder="Selling price"
                          aria-label="Selling price"
                        />
                        <Input
                          type="number"
                          min="0"
                          value={variant.minStock}
                          onChange={(event) => setVariant(variant.key, { minStock: event.target.value })}
                          placeholder="Min stock"
                          aria-label="Minimum stock"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setVariants((current) => [
                    ...current,
                    {
                      ...emptyVariant(),
                      costPrice: form.costPrice,
                      sellingPrice: form.sellingPrice,
                      minStock: form.minStock,
                      reorderLevel: form.reorderLevel,
                    },
                  ])
                }
              >
                <Plus className="h-4 w-4" />
                Add variant
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Defaults applied to new variants.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="costPrice">Cost price</Label>
                <Input id="costPrice" type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => set('costPrice', event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sellingPrice">Selling price</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(event) => set('sellingPrice', event.target.value)}
                  aria-invalid={Boolean(errors.sellingPrice)}
                />
                {errors.sellingPrice ? <p className="text-xs text-amber-600">{errors.sellingPrice}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wholesalePrice">Wholesale price</Label>
                <Input id="wholesalePrice" type="number" min="0" step="0.01" value={form.wholesalePrice} onChange={(event) => set('wholesalePrice', event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxRate">Tax rate (%)</Label>
                <Input id="taxRate" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(event) => set('taxRate', event.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock levels</CardTitle>
              <CardDescription>Used for low-stock alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="minStock">Minimum stock</Label>
                <Input id="minStock" type="number" min="0" value={form.minStock} onChange={(event) => set('minStock', event.target.value)} placeholder={String(settings.inventory.defaultMinStock)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reorderLevel">Reorder level</Label>
                <Input id="reorderLevel" type="number" min="0" value={form.reorderLevel} onChange={(event) => set('reorderLevel', event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxStock">Maximum stock</Label>
                <Input id="maxStock" type="number" min="0" value={form.maxStock} onChange={(event) => set('maxStock', event.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
