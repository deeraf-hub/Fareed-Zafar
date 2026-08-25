import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { categories as seedCategories } from '../data/categories';
import { products as seedProducts, slugify } from '../data/products';
import { readStorage, storageKeys, writeStorage } from '../lib/storage';
import type { Category, Product } from '../types';

/**
 * Holds the catalogue for the whole app. Seeded from the data files and
 * persisted to localStorage so admin edits survive a refresh.
 *
 * Swapping this for a real backend (Supabase/Firebase) means replacing the
 * three mutators below with API calls — no UI component reads the data files
 * directly.
 */
interface CatalogValue {
  products: Product[];
  categories: Category[];
  loading: boolean;
  getProductBySlug: (slug: string) => Product | undefined;
  getProductById: (id: string) => Product | undefined;
  createProduct: (input: Omit<Product, 'id' | 'slug' | 'createdAt' | 'images' | 'stock'>) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  createCategory: (input: Pick<Category, 'name' | 'description' | 'image'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  resetCatalog: () => void;
}

interface PersistedCatalog {
  products: Product[];
  categories: Category[];
}

const CatalogContext = createContext<CatalogValue | null>(null);

export const CatalogProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [loading, setLoading] = useState(true);

  // Hydrate once on mount; the brief short delay drives the skeleton loaders.
  useEffect(() => {
    const stored = readStorage<PersistedCatalog>(storageKeys.catalog);
    if (stored?.products?.length) setProducts(stored.products);
    if (stored?.categories?.length) setCategories(stored.categories);
    const timer = window.setTimeout(() => setLoading(false), 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    writeStorage(storageKeys.catalog, { products, categories });
  }, [products, categories, loading]);

  const getProductBySlug = useCallback((slug: string) => products.find((p) => p.slug === slug), [products]);
  const getProductById = useCallback((id: string) => products.find((p) => p.id === id), [products]);

  const createProduct: CatalogValue['createProduct'] = useCallback((input) => {
    const product: Product = {
      ...input,
      id: `prd-${Date.now().toString(36)}`,
      slug: slugify(input.name),
      images: [input.image],
      stock: input.stockQuantity > 0,
      createdAt: new Date().toISOString(),
    };
    setProducts((current) => [product, ...current]);
    return product;
  }, []);

  const updateProduct: CatalogValue['updateProduct'] = useCallback((id, patch) => {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== id) return product;
        const next = { ...product, ...patch };
        if (patch.name) next.slug = slugify(patch.name);
        if (patch.stockQuantity !== undefined) next.stock = patch.stockQuantity > 0;
        if (patch.image) next.images = [patch.image];
        return next;
      }),
    );
  }, []);

  const deleteProduct: CatalogValue['deleteProduct'] = useCallback((id) => {
    setProducts((current) => current.filter((product) => product.id !== id));
  }, []);

  const createCategory: CatalogValue['createCategory'] = useCallback((input) => {
    setCategories((current) => [
      ...current,
      {
        id: `cat-${Date.now().toString(36)}`,
        name: input.name,
        slug: slugify(input.name) as Category['slug'],
        description: input.description,
        image: input.image,
        fallbackImage: '/products/spark-plug.svg',
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const updateCategory: CatalogValue['updateCategory'] = useCallback((id, patch) => {
    setCategories((current) => current.map((category) => (category.id === id ? { ...category, ...patch } : category)));
  }, []);

  const deleteCategory: CatalogValue['deleteCategory'] = useCallback((id) => {
    setCategories((current) => current.filter((category) => category.id !== id));
  }, []);

  const resetCatalog = useCallback(() => {
    setProducts(seedProducts);
    setCategories(seedCategories);
  }, []);

  const value = useMemo<CatalogValue>(
    () => ({
      products,
      categories,
      loading,
      getProductBySlug,
      getProductById,
      createProduct,
      updateProduct,
      deleteProduct,
      createCategory,
      updateCategory,
      deleteCategory,
      resetCatalog,
    }),
    [
      products,
      categories,
      loading,
      getProductBySlug,
      getProductById,
      createProduct,
      updateProduct,
      deleteProduct,
      createCategory,
      updateCategory,
      deleteCategory,
      resetCatalog,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = (): CatalogValue => {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used inside CatalogProvider');
  return context;
};
