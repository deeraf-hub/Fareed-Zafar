import type { PriceBand, Product, ShopFilters, SortKey } from '../types';

export const priceBands: PriceBand[] = [
  { id: 'under-500', label: 'Under PKR 500', min: 0, max: 499 },
  { id: '500-1000', label: 'PKR 500 – 1,000', min: 500, max: 1000 },
  { id: '1000-2500', label: 'PKR 1,000 – 2,500', min: 1000, max: 2500 },
  { id: '2500-5000', label: 'PKR 2,500 – 5,000', min: 2500, max: 5000 },
];

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
];

export const emptyFilters: ShopFilters = {
  query: '',
  categories: [],
  bikes: [],
  priceBands: [],
  customMin: null,
  customMax: null,
  availability: [],
  sort: 'featured',
};

const normalise = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Scores a product against a free-text query. Matches on name, SKU, category,
 * description and compatible bikes, so "cd 70" and "QAS-BRK-001" both work.
 */
export const searchScore = (product: Product, query: string): number => {
  const q = normalise(query);
  if (!q) return 1;
  const terms = q.split(' ').filter(Boolean);
  const name = normalise(product.name);
  const sku = normalise(product.sku);
  const bikes = normalise(product.compatibleBikes.join(' '));
  const category = normalise(product.category.replace(/-/g, ' '));
  const text = `${name} ${sku} ${bikes} ${category} ${normalise(product.shortDescription)} ${normalise(product.description)}`;

  let score = 0;
  for (const term of terms) {
    if (!text.includes(term)) return 0; // every term must match somewhere
    if (name.startsWith(term)) score += 6;
    else if (name.includes(term)) score += 5;
    if (sku.includes(term)) score += 4;
    if (bikes.includes(term)) score += 3;
    if (category.includes(term)) score += 2;
    score += 1;
  }
  if (name.includes(q)) score += 8;
  if (bikes.includes(q)) score += 4;
  return score;
};

export const matchesFilters = (product: Product, filters: ShopFilters): boolean => {
  if (filters.categories.length && !filters.categories.includes(product.category)) return false;
  if (filters.bikes.length && !filters.bikes.some((bike) => product.compatibleBikes.includes(bike))) return false;

  if (filters.priceBands.length) {
    const inBand = filters.priceBands.some((id) => {
      const band = priceBands.find((b) => b.id === id);
      if (!band) return false;
      return product.price >= band.min && (band.max === null || product.price <= band.max);
    });
    if (!inBand) return false;
  }

  if (filters.customMin !== null && product.price < filters.customMin) return false;
  if (filters.customMax !== null && product.price > filters.customMax) return false;

  if (filters.availability.length === 1) {
    const wantInStock = filters.availability[0] === 'in-stock';
    if (product.stock !== wantInStock) return false;
  }

  return true;
};

export const sortProducts = (list: Product[], sort: SortKey): Product[] => {
  const sorted = [...list];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'newest':
      return sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case 'popular':
      return sorted.sort((a, b) => Number(b.popular) - Number(a.popular) || b.stockQuantity - a.stockQuantity);
    case 'featured':
    default:
      return sorted.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || Number(b.stock) - Number(a.stock) || a.price - b.price,
      );
  }
};

/** Applies search, filters and sorting in one pass. */
export const applyShopFilters = (all: Product[], filters: ShopFilters): Product[] => {
  const filtered = all.filter((product) => matchesFilters(product, filters));
  if (!filters.query.trim()) return sortProducts(filtered, filters.sort);

  const scored = filtered
    .map((product) => ({ product, score: searchScore(product, filters.query) }))
    .filter((entry) => entry.score > 0);

  if (filters.sort === 'featured') {
    return scored.sort((a, b) => b.score - a.score).map((entry) => entry.product);
  }
  return sortProducts(
    scored.map((entry) => entry.product),
    filters.sort,
  );
};

/** Top suggestions for the header search box. */
export const searchSuggestions = (all: Product[], query: string, limit = 6): Product[] => {
  if (!query.trim()) return [];
  return all
    .map((product) => ({ product, score: searchScore(product, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);
};

export const activeFilterCount = (filters: ShopFilters): number =>
  filters.categories.length +
  filters.bikes.length +
  filters.priceBands.length +
  filters.availability.length +
  (filters.customMin !== null || filters.customMax !== null ? 1 : 0);
