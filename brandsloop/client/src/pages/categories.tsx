import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Brand, Category } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [form, setForm] = React.useState({ name: '', description: '', parentId: '', isActive: true });
  const [error, setError] = React.useState<string | null>(null);
  const [brandOpen, setBrandOpen] = React.useState(false);
  const [brandName, setBrandName] = React.useState('');

  const { data: categories, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: ['categories', 'manage'],
    queryFn: () => api.get<{ data: Category[] }>('/categories', { includeInactive: true }).then((r) => r.data),
  });
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get<{ data: Brand[] }>('/brands').then((r) => r.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['brands'] });
  };

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing ? api.put(`/categories/${editing.id}`, payload) : api.post('/categories', payload),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Category updated' : 'Category added');
      setOpen(false);
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not save the category.';
      setError(message);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Category deleted');
    },
    onError: (err) => toast.error('Could not delete the category', (err as Error).message),
  });

  const saveBrand = useMutation({
    mutationFn: () => api.post('/brands', { name: brandName }),
    onSuccess: () => {
      invalidate();
      toast.success('Brand added');
      setBrandOpen(false);
      setBrandName('');
    },
    onError: (err) => toast.error('Could not add the brand', (err as Error).message),
  });

  const removeBrand = useMutation({
    mutationFn: (id: string) => api.delete(`/brands/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Brand deleted');
    },
    onError: (err) => toast.error('Could not delete the brand', (err as Error).message),
  });

  const openNew = (parentId = '') => {
    setEditing(null);
    setForm({ name: '', description: '', parentId, isActive: true });
    setError(null);
    setOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? '',
      parentId: category.parentId ?? '',
      isActive: category.isActive,
    });
    setError(null);
    setOpen(true);
  };

  const onDelete = async (category: Category) => {
    const confirmed = await confirm({
      title: `Delete ${category.name}?`,
      description: 'Categories with products cannot be deleted — deactivate them instead.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) remove.mutate(category.id);
  };

  const roots = categories?.filter((category) => !category.parentId) ?? [];
  const canManage = can('category:manage');

  return (
    <>
      <PageHeader
        title="Categories & brands"
        description="How the catalogue is organised. Categories can have one level of subcategories."
        breadcrumbs={[{ label: 'Categories' }]}
        actions={
          canManage ? (
            <>
              <Button variant="outline" onClick={() => setBrandOpen(true)}><Plus className="h-4 w-4" />Add brand</Button>
              <Button onClick={() => openNew()}><Plus className="h-4 w-4" />Add category</Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>{roots.length} top-level categories</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isError ? (
              <ErrorState message={(listError as Error).message} onRetry={() => refetch()} />
            ) : isLoading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
            ) : roots.length === 0 ? (
              <EmptyState
                icon={Tags}
                title="No categories yet"
                description="Categories group products — Jeans, T-Shirts, Caps and so on."
                action={canManage ? <Button onClick={() => openNew()}><Plus className="h-4 w-4" />Add category</Button> : null}
              />
            ) : (
              <ul className="divide-y">
                {roots.map((parent) => {
                  const children = categories?.filter((category) => category.parentId === parent.id) ?? [];
                  return (
                    <li key={parent.id}>
                      <div className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            {parent.name}
                            {!parent.isActive ? <Badge variant="muted">Inactive</Badge> : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {parent._count?.products ?? 0} product{parent._count?.products === 1 ? '' : 's'}
                            {children.length > 0 ? ` · ${children.length} subcategor${children.length === 1 ? 'y' : 'ies'}` : ''}
                          </p>
                        </div>
                        {canManage ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => openNew(parent.id)} aria-label={`Add subcategory to ${parent.name}`}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(parent)} aria-label={`Edit ${parent.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => onDelete(parent)} aria-label={`Delete ${parent.name}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      {children.length > 0 ? (
                        <ul className="bg-muted/30">
                          {children.map((child) => (
                            <li key={child.id} className="flex items-center justify-between gap-3 border-t px-5 py-2.5 pl-10">
                              <div className="flex min-w-0 items-center gap-2">
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm">{child.name}</p>
                                  <p className="text-xs text-muted-foreground">{child._count?.products ?? 0} products</p>
                                </div>
                              </div>
                              {canManage ? (
                                <div className="flex shrink-0 items-center gap-1">
                                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(child)} aria-label={`Edit ${child.name}`}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon-sm" onClick={() => onDelete(child)} aria-label={`Delete ${child.name}`}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brands</CardTitle>
            <CardDescription>{brands?.length ?? 0} brands</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!brands || brands.length === 0 ? (
              <EmptyState title="No brands yet" description="Brands are optional but help with filtering." />
            ) : (
              <ul className="divide-y">
                {brands.map((brand) => (
                  <li key={brand.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">{brand._count?.products ?? 0} products</p>
                    </div>
                    {canManage ? (
                      <Button variant="ghost" size="icon-sm" onClick={() => removeBrand.mutate(brand.id)} aria-label={`Delete ${brand.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.name}` : 'Add category'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="categoryName" required>Name</Label>
              <Input
                id="categoryName"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                autoFocus
                placeholder="e.g. Jeans"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoryParent">Parent category</Label>
              <Select
                id="categoryParent"
                value={form.parentId}
                onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
              >
                <option value="">Top level</option>
                {roots.filter((category) => category.id !== editing?.id).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={2}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              Active
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                save.mutate({
                  name: form.name,
                  description: form.description || undefined,
                  parentId: form.parentId || null,
                  isActive: form.isActive,
                })
              }
              loading={save.isPending}
              disabled={!form.name.trim()}
            >
              {editing ? 'Save changes' : 'Add category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={brandOpen} onOpenChange={setBrandOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Add brand</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="brandName" required>Brand name</Label>
            <Input id="brandName" value={brandName} onChange={(event) => setBrandName(event.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandOpen(false)}>Cancel</Button>
            <Button onClick={() => saveBrand.mutate()} loading={saveBrand.isPending} disabled={!brandName.trim()}>
              Add brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
