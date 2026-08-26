import type { Review } from '@/types'

/**
 * Demo testimonials and product reviews. Structured exactly as a reviews API would
 * return them, so `GET /api/reviews?productId=…` can replace this module later.
 */

export const testimonials: Review[] = [
  {
    id: 'r-001',
    author: 'Ayesha K.',
    city: 'Karachi',
    rating: 5,
    title: 'Beautiful in person',
    body: 'Absolutely beautiful jewellery and the packaging was amazing. It looked even better in person than on the website.',
    date: '2026-08-02',
    verified: true,
  },
  {
    id: 'r-002',
    author: 'Fatima S.',
    city: 'Lahore',
    rating: 5,
    title: 'Perfect for my wedding',
    body: 'Perfect for my wedding. The finishing was beautiful and it stayed comfortable through the whole function.',
    date: '2026-07-21',
    verified: true,
  },
  {
    id: 'r-003',
    author: 'Hira M.',
    city: 'Islamabad',
    rating: 5,
    title: 'Elegant and well made',
    body: 'Elegant designs and excellent customer service. They answered every question before I ordered.',
    date: '2026-07-14',
    verified: true,
  },
  {
    id: 'r-004',
    author: 'Sana R.',
    city: 'Karachi',
    rating: 4,
    title: 'Lovely everyday pieces',
    body: 'I ordered two chains for daily wear and both have held their colour. Delivery took three days to Gulshan.',
    date: '2026-06-30',
    verified: true,
  },
  {
    id: 'r-005',
    author: 'Mehwish A.',
    city: 'Peshawar',
    rating: 5,
    title: 'Gifted and loved',
    body: 'Bought a set as a gift for my sister. The box alone made it feel special — she was thrilled.',
    date: '2026-06-18',
    verified: true,
  },
  {
    id: 'r-006',
    author: 'Nadia B.',
    city: 'Multan',
    rating: 5,
    title: 'Worth every rupee',
    body: 'The weight and finish are exactly what was described. This is now where I shop for family weddings.',
    date: '2026-06-05',
    verified: true,
  },
]

const PRODUCT_REVIEW_TEMPLATES = [
  {
    author: 'Ayesha K.',
    city: 'Karachi',
    rating: 5,
    title: 'Exactly as pictured',
    body: 'The finish is lovely and it arrived carefully packed. I have worn it three times already.',
  },
  {
    author: 'Rabia N.',
    city: 'Lahore',
    rating: 5,
    title: 'Beautiful craftsmanship',
    body: 'You can feel the quality when you hold it. The clasp is secure and the weight feels right.',
  },
  {
    author: 'Zoya H.',
    city: 'Islamabad',
    rating: 4,
    title: 'Very pretty, slightly delicate',
    body: 'Gorgeous piece for events. I am careful with it, but that is true of anything this fine.',
  },
  {
    author: 'Maria T.',
    city: 'Hyderabad',
    rating: 5,
    title: 'Great gift',
    body: 'Ordered for my mother and she loved it. Customer service confirmed the order the same day.',
  },
]

/** Deterministic demo reviews for a product page. */
export function reviewsForProduct(productId: string, count = 4): Review[] {
  return PRODUCT_REVIEW_TEMPLATES.slice(0, count).map((template, index) => ({
    id: `${productId}-review-${index + 1}`,
    productId,
    date: ['2026-08-08', '2026-07-19', '2026-07-02', '2026-06-11'][index] ?? '2026-06-01',
    verified: true,
    ...template,
  }))
}
