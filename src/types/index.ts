import type { PhotoKey } from '@/assets/photography/photos'

export type CategorySlug =
  | 'necklaces'
  | 'earrings'
  | 'rings'
  | 'bracelets'
  | 'bangles'
  | 'bridal'
  | 'sets'
  | 'new-arrivals'

export interface Category {
  slug: CategorySlug
  name: string
  description: string
  /** Cover photo key, see assets/photography/photos.ts */
  photo: PhotoKey
}

export type Material = 'Gold Plated' | '18K Gold' | 'Sterling Silver' | 'Rose Gold' | 'Pearl' | 'Diamond Accent'

export interface ProductReview {
  id: string
  author: string
  rating: 1 | 2 | 3 | 4 | 5
  date: string
  title: string
  body: string
  verified: boolean
}

export interface Product {
  id: string
  slug: string
  name: string
  category: CategorySlug
  collection?: string
  price: number
  compareAtPrice?: number
  currency: 'PKR'
  rating: number
  reviewCount: number
  reviews: ProductReview[]
  material: Material
  weight: string
  dimensions: string
  description: string
  careInstructions: string
  images: PhotoKey[]
  inStock: boolean
  stockCount: number
  featured?: boolean
  bestSeller?: boolean
  isNew?: boolean
  tags: string[]
}

export interface CartLine {
  productId: string
  quantity: number
}

export interface Address {
  id: string
  label: string
  fullName: string
  phone: string
  addressLine: string
  city: string
  area: string
  postalCode: string
  isDefault?: boolean
}

export interface Order {
  id: string
  date: string
  status: 'Processing' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled'
  items: { productId: string; name: string; quantity: number; price: number }[]
  total: number
  deliveryFee: number
  paymentMethod: string
  address: Omit<Address, 'id' | 'label' | 'isDefault'>
}

export interface AuthUser {
  id: string
  fullName: string
  email: string
  phone?: string
  addresses: Address[]
  orders: Order[]
}

export interface Testimonial {
  id: string
  author: string
  location: string
  rating: 1 | 2 | 3 | 4 | 5
  quote: string
}
