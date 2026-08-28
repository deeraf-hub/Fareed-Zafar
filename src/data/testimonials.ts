import type { Testimonial } from '@/types'

/**
 * Demo testimonials. Structured to map 1:1 onto a future `reviews`/`testimonials`
 * table so these can be replaced by real, database-backed customer reviews.
 */
export const testimonials: Testimonial[] = [
  {
    id: 't1',
    author: 'Ayesha Khan',
    location: 'Karachi',
    rating: 5,
    quote: 'Absolutely beautiful jewellery and the packaging was amazing. It felt like unwrapping a gift from a five-star brand.',
  },
  {
    id: 't2',
    author: 'Fatima Ahmed',
    location: 'Swabi',
    rating: 5,
    quote: 'Perfect for my wedding. The finishing was beautiful and it stayed just as gorgeous through a full day of celebrations.',
  },
  {
    id: 't3',
    author: 'Zara Hussain',
    location: 'Lahore',
    rating: 5,
    quote: 'Elegant designs and excellent customer service. They helped me pick the right set for my sister\'s mehndi.',
  },
  {
    id: 't4',
    author: 'Mariam Siddiqui',
    location: 'Islamabad',
    rating: 4,
    quote: 'Great quality for the price — doesn\'t look like a Rs. 5,000 piece at all. Will definitely order again.',
  },
  {
    id: 't5',
    author: 'Hina Malik',
    location: 'Peshawar',
    rating: 5,
    quote: 'My go-to gift shop now. Fast delivery, beautiful presentation and pieces that actually get worn, not just kept in a box.',
  },
  {
    id: 't6',
    author: 'Sana Raza',
    location: 'Karachi',
    rating: 5,
    quote: 'The Heritage Set exceeded every expectation for my valima. Genuinely felt bridal without feeling heavy.',
  },
]
