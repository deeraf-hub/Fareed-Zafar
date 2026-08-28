/**
 * Central, editable business configuration.
 * Change brand copy, contact details and policy text here — nothing below
 * should ever be hardcoded again inside a page or component.
 */
export const siteConfig = {
  brandName: 'Swabi Jewellers',
  tagline: 'Timeless Jewellery. Made to Be Remembered.',
  supportingText:
    'Discover elegant jewellery crafted to celebrate your most beautiful moments.',

  announcementText: 'Complimentary Delivery on Orders Above Rs. 10,000',

  currency: 'PKR' as const,
  currencySymbol: 'Rs.',

  freeDeliveryThreshold: 10000,
  standardDeliveryFee: 250,

  contact: {
    phone: '0333-2363722',
    phoneHref: 'tel:+923332363722',
    email: 'hello@swabijewellers.pk',
    address: 'KS 7144, Last Mason Road, Bhutta Village, Karachi West, Keamari Town, Karachi, Pakistan',
    addressShort: 'Karachi, Pakistan',
  },

  social: {
    instagram: '@swabijewellers',
    instagramUrl: 'https://instagram.com/swabijewellers',
    facebookUrl: 'https://facebook.com/swabijewellers',
    tiktokUrl: 'https://tiktok.com/@swabijewellers',
  },

  policies: {
    delivery:
      'We deliver across Pakistan through trusted courier partners. Orders are processed within 1–2 business days and typically arrive within 3–6 business days depending on your city. Delivery is complimentary on orders above Rs. 10,000; a standard delivery fee applies below that.',
    returns:
      'We want you to love your jewellery. Unworn, unused items in their original packaging can be returned or exchanged within 7 days of delivery. Bridal and custom orders are final sale. Contact our support team to begin a return.',
    care:
      'Keep jewellery away from perfume, water and direct sunlight. Store each piece separately in its pouch or box to prevent scratching. Clean gently with a soft, dry cloth after wear.',
  },
} as const

export type SiteConfig = typeof siteConfig
