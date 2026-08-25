/**
 * PLACEHOLDER customer feedback.
 *
 * These are sample entries so the section has content — replace them with real,
 * verified customer feedback before launch (the page shows a note saying so).
 */
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  city: string;
  quote: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 't-1',
    name: 'Workshop owner',
    role: 'Regular trade customer',
    city: 'Lahore',
    quote:
      'The fitment list on each part saves us time — we can check a CD 70 part against a Road Prince before ordering.',
  },
  {
    id: 't-2',
    name: 'Delivery rider',
    role: 'Daily rider',
    city: 'Rawalpindi',
    quote: 'Ordered a chain set on WhatsApp in the evening and paid cash when it arrived. Simple process.',
  },
  {
    id: 't-3',
    name: 'Bike owner',
    role: 'CG 125 owner',
    city: 'Faisalabad',
    quote: 'Prices are listed clearly and the brake shoes matched what my mechanic asked for.',
  },
];
