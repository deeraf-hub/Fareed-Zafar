/**
 * Single source of truth for business information.
 *
 * Everything a shop owner is likely to change — announcement text, phone number,
 * address, social handles, delivery rules — lives here and nowhere else, so an
 * admin dashboard or CMS can later replace this file without touching the UI.
 */

export const siteConfig = {
  name: 'Swabi Jewellers',
  tagline: 'Timeless Jewellery. Made to Be Remembered.',
  description:
    'Elegant gold-plated, pearl, kundan-style and bridal imitation jewellery, crafted to celebrate your most beautiful moments. Delivered across Pakistan.',
  url: 'https://swabijewellers.pk',
  locale: 'en-PK',

  announcement: 'Complimentary Delivery on Orders Above Rs. 10,000',

  contact: {
    phone: '0333-2363722',
    phoneHref: 'tel:+923332363722',
    email: 'hello@swabijewellers.pk',
    addressLines: [
      'Swabi Jewellers: KS 7144, Last Mason Road',
      'Bhutta Village, Karachi West, Keamari Town',
    ],
    city: 'Karachi',
    country: 'Pakistan',
    hours: 'Monday – Saturday, 11:00 am – 9:00 pm',
  },

  social: {
    instagram: { handle: '@swabijewellers', url: 'https://instagram.com/swabijewellers' },
    facebook: { handle: 'Swabi Jewellers', url: 'https://facebook.com/swabijewellers' },
    tiktok: { handle: '@swabijewellers', url: 'https://tiktok.com/@swabijewellers' },
  },

  /** Delivery + order rules used by the cart and checkout summaries. */
  commerce: {
    currency: 'PKR',
    currencySymbol: 'Rs.',
    freeDeliveryThreshold: 10000,
    deliveryFee: 350,
    returnWindowDays: 7,
    dispatchCopy: 'Dispatched within 1–2 working days · 2–5 days delivery nationwide',
  },

  /** Payment methods surfaced at checkout. Gateways plug in behind these ids. */
  paymentMethods: [
    {
      id: 'cod',
      label: 'Cash on Delivery',
      note: 'Pay the courier when your order arrives.',
      enabled: true,
    },
    {
      id: 'bank-transfer',
      label: 'Bank Transfer',
      note: 'Account details are shared on your order confirmation.',
      enabled: true,
    },
    { id: 'easypaisa', label: 'Easypaisa', note: 'Pay from your Easypaisa wallet.', enabled: true },
    { id: 'jazzcash', label: 'JazzCash', note: 'Pay from your JazzCash wallet.', enabled: true },
    {
      id: 'card',
      label: 'Debit / Credit Card',
      note: 'Secure card payment — coming soon.',
      enabled: false,
    },
  ],
} as const

export type PaymentMethodId = (typeof siteConfig.paymentMethods)[number]['id']
