import type { Category } from '@/types'

/**
 * Demo category catalog. In a future backend this becomes a `categories`
 * table managed from an admin dashboard — nothing here is referenced
 * directly by UI components without going through this file.
 */
export const categories: Category[] = [
  {
    slug: 'necklaces',
    name: 'Necklaces',
    description: 'Statement pendants and delicate chains for every occasion.',
    scene: 'necklace',
  },
  {
    slug: 'earrings',
    name: 'Earrings',
    description: 'Studs, drops and jhumkas crafted to catch the light.',
    scene: 'earrings',
  },
  {
    slug: 'rings',
    name: 'Rings',
    description: 'Everyday bands to statement cocktail rings.',
    scene: 'ring',
  },
  {
    slug: 'bracelets',
    name: 'Bracelets',
    description: 'Fine chain bracelets with charm and character.',
    scene: 'bracelet',
  },
  {
    slug: 'bangles',
    name: 'Bangles',
    description: 'Classic stacks and single statement bangles.',
    scene: 'bangles',
  },
  {
    slug: 'bridal',
    name: 'Bridal Jewellery',
    description: 'Complete bridal sets for your most beautiful day.',
    scene: 'bridal',
  },
  {
    slug: 'sets',
    name: 'Sets',
    description: 'Matching necklace, earring and ring sets.',
    scene: 'set',
  },
  {
    slug: 'new-arrivals',
    name: 'New Arrivals',
    description: 'The newest additions to the Swabi Jewellers collection.',
    scene: 'arrivals',
  },
]

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug)
}
