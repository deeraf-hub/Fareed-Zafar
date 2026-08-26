import type { Product } from '@/types'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ProductGrid } from '@/components/product/ProductGrid'

interface ProductSectionProps {
  eyebrow?: string
  title: string
  description?: string
  products: Product[]
  link?: { label: string; to: string }
  showRating?: boolean
  align?: 'center' | 'left'
  className?: string
}

export function ProductSection({
  eyebrow,
  title,
  description,
  products,
  link,
  showRating,
  align = 'center',
  className = '',
}: ProductSectionProps) {
  if (products.length === 0) return null
  return (
    <section className={`container-luxe py-20 lg:py-24 ${className}`}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        align={align}
        link={link}
      />
      <ProductGrid products={products} showRating={showRating} className="mt-12 lg:mt-16" />
    </section>
  )
}
