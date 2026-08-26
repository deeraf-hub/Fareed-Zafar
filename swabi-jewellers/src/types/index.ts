export type CategorySlug =
  | 'necklaces'
  | 'earrings'
  | 'rings'
  | 'bracelets'
  | 'bangles'
  | 'bridal-jewellery'
  | 'sets'
  | 'new-arrivals'

export type MotifKind =
  | 'necklace'
  | 'earrings'
  | 'ring'
  | 'bracelet'
  | 'bangle'
  | 'set'
  | 'pendant'
  | 'model-portrait'
  | 'model-closeup'
  | 'bridal-model'
  | 'everyday-model'
  | 'hand-shot'
  | 'packaging'
  | 'lifestyle'

/**
 * Every image on the site is described by one of these records. `src` is empty in the
 * demo build, so a brand-consistent SVG placeholder is rendered from `motif`/`tone`.
 * Drop in a real photograph URL (or an imported asset) and the site picks it up with
 * no other change — `prompt` doubles as the photography / generation brief.
 */
export interface ImageAsset {
  id: string
  /** Real photography URL. Empty string renders the branded placeholder instead. */
  src: string
  alt: string
  motif: MotifKind
  prompt: string
  tone?: 'ivory' | 'champagne' | 'navy' | 'blush' | 'sand'
}

export interface Category {
  slug: CategorySlug
  name: string
  tagline: string
  description: string
  image: ImageAsset
  /** Virtual categories (New Arrivals) are computed, not stored on products. */
  virtual?: boolean
}

export type Material =
  | 'Gold Plated'
  | 'Rose Gold Plated'
  | 'Silver Plated'
  | 'Rhodium Plated'
  | 'Brass Alloy'
  | 'AD Stones'
  | 'Faux Pearl'
  | 'Kundan Style'
  | 'Meenakari'
  | 'Zircon'
  | 'Crystal'
  | 'Enamel'

export interface Review {
  id: string
  productId?: string
  author: string
  city: string
  rating: number
  title: string
  body: string
  date: string
  verified: boolean
}

export interface Product {
  id: string
  slug: string
  name: string
  category: Exclude<CategorySlug, 'new-arrivals'>
  collection: string
  price: number
  compareAtPrice?: number
  materials: Material[]
  description: string
  details: {
    weight: string
    dimensions: string
    finish: string
    stones: string
  }
  care: string
  images: ImageAsset[]
  rating: number
  reviewCount: number
  inStock: boolean
  stock: number
  badges?: string[]
  isNew?: boolean
  isFeatured?: boolean
  isBestSeller?: boolean
  createdAt: string
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
  line1: string
  area: string
  city: string
  postalCode: string
  isDefault?: boolean
}

export interface OrderLine {
  productId: string
  name: string
  slug: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  placedAt: string
  status: 'Processing' | 'Packed' | 'Dispatched' | 'Delivered'
  lines: OrderLine[]
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  paymentMethod: string
  customer: {
    fullName: string
    email: string
    phone: string
  }
  address: {
    line1: string
    area: string
    city: string
    postalCode: string
  }
}

export interface Customer {
  id: string
  fullName: string
  email: string
  phone?: string
  createdAt: string
}
