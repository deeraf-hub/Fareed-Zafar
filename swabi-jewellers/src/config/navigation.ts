import { shoppableCategories } from '@/data/categories'

export interface NavItem {
  label: string
  to: string
  children?: { label: string; to: string }[]
}

export const primaryNav: NavItem[] = [
  { label: 'Home', to: '/' },
  {
    label: 'Jewellery',
    to: '/shop',
    children: [
      { label: 'All Jewellery', to: '/shop' },
      ...shoppableCategories.map((category) => ({
        label: category.name,
        to: `/shop/${category.slug}`,
      })),
    ],
  },
  { label: 'New Arrivals', to: '/new-arrivals' },
  { label: 'Collections', to: '/collections' },
  { label: 'Bridal', to: '/bridal' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export const footerNav = {
  shop: [
    { label: 'All Jewellery', to: '/shop' },
    { label: 'New Arrivals', to: '/new-arrivals' },
    { label: 'Best Sellers', to: '/shop?sort=best-selling' },
    { label: 'Bridal', to: '/bridal' },
    { label: 'Collections', to: '/collections' },
  ],
  care: [
    { label: 'Contact Us', to: '/contact' },
    { label: 'Delivery Information', to: '/delivery' },
    { label: 'Returns & Exchanges', to: '/returns' },
    { label: 'Jewellery Care', to: '/jewellery-care' },
    { label: 'FAQs', to: '/faqs' },
  ],
  company: [
    { label: 'About Us', to: '/about' },
    { label: 'Our Story', to: '/about#story' },
    { label: 'Contact', to: '/contact' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms & Conditions', to: '/terms' },
  ],
}
