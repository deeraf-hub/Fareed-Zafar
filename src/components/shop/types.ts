import type { Material } from '@/types'

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'best-selling'

export const sortLabels: Record<SortOption, string> = {
  featured: 'Featured',
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  'best-selling': 'Best Selling',
}

export const priceBuckets = [
  { label: 'Under Rs. 5,000', min: 0, max: 5000 },
  { label: 'Rs. 5,000 – 15,000', min: 5000, max: 15000 },
  { label: 'Rs. 15,000 – 40,000', min: 15000, max: 40000 },
  { label: 'Above Rs. 40,000', min: 40000, max: Infinity },
] as const

export const allMaterials: Material[] = ['Gold Plated', '18K Gold', 'Sterling Silver', 'Rose Gold', 'Pearl', 'Diamond Accent']

export interface ShopFilterState {
  priceBucketIndex: number | null
  materials: Material[]
  bridalOnly: boolean
  inStockOnly: boolean
  minRating: number
}

export const defaultFilters: ShopFilterState = {
  priceBucketIndex: null,
  materials: [],
  bridalOnly: false,
  inStockOnly: false,
  minRating: 0,
}
