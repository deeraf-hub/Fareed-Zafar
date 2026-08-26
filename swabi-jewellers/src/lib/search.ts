import type { Product } from '@/types'
import { products } from '@/data/products'
import { categories } from '@/data/categories'

export interface SearchSuggestion {
  type: 'product' | 'category' | 'collection'
  label: string
  sublabel?: string
  to: string
  product?: Product
}

function score(haystack: string, needle: string): number {
  const value = haystack.toLowerCase()
  if (value === needle) return 100
  if (value.startsWith(needle)) return 80
  if (value.includes(needle)) return 55
  return 0
}

/** Ranked instant-search across products, categories and collections. */
export function searchAll(rawQuery: string, limit = 8): SearchSuggestion[] {
  const query = rawQuery.trim().toLowerCase()
  if (query.length < 2) return []

  const productHits = products
    .map((product) => {
      const relevance = Math.max(
        score(product.name, query),
        score(product.collection, query) - 10,
        score(product.category.replace(/-/g, ' '), query) - 15,
        product.materials.some((material) => material.toLowerCase().includes(query)) ? 45 : 0,
        product.description.toLowerCase().includes(query) ? 25 : 0,
      )
      return { product, relevance }
    })
    .filter((entry) => entry.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || b.product.rating - a.product.rating)
    .map<SearchSuggestion>(({ product }) => ({
      type: 'product',
      label: product.name,
      sublabel: product.collection,
      to: `/product/${product.slug}`,
      product,
    }))

  const categoryHits = categories
    .filter((category) => score(category.name, query) > 0)
    .map<SearchSuggestion>((category) => ({
      type: 'category',
      label: category.name,
      sublabel: 'Category',
      to: category.slug === 'new-arrivals' ? '/new-arrivals' : `/shop/${category.slug}`,
    }))

  const collectionHits = Array.from(new Set(products.map((product) => product.collection)))
    .filter((collection) => score(collection, query) > 0)
    .map<SearchSuggestion>((collection) => ({
      type: 'collection',
      label: collection,
      sublabel: 'Collection',
      to: `/collections/${collection.toLowerCase().replace(/\s+/g, '-')}`,
    }))

  return [...categoryHits, ...collectionHits, ...productHits].slice(0, limit)
}

/** Full result set for the shop page's `?q=` parameter. */
export function searchProducts(rawQuery: string): Product[] {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return products
  return products.filter((product) =>
    [
      product.name,
      product.collection,
      product.category.replace(/-/g, ' '),
      product.description,
      ...product.materials,
    ]
      .join(' ')
      .toLowerCase()
      .includes(query),
  )
}
