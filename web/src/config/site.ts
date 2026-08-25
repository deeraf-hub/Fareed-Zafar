/**
 * Single source of truth for business information.
 *
 * Every value marked PLACEHOLDER must be replaced with the real business
 * detail before going live. Nothing else in the codebase hardcodes a phone
 * number, address or WhatsApp number — change it here and it changes everywhere.
 */

/** WhatsApp number in international format, digits only (no +, spaces or dashes). */
export const WHATSAPP_NUMBER = '923000000000'; // PLACEHOLDER

export const siteConfig = {
  name: 'Qalandari Autos & Spare Parts',
  shortName: 'Qalandari Autos',
  tagline: 'Quality Motorcycle Spare Parts at the Right Price',
  description:
    'Motorcycle spare parts and accessories for Honda, Yamaha, Suzuki, United, Road Prince and Super Power bikes. Engine, electrical, brake, suspension and chain parts with cash on delivery across Pakistan.',

  /** Contact details — PLACEHOLDER values until confirmed by the business. */
  phone: '+92 300 0000000', // PLACEHOLDER
  phoneHref: 'tel:+923000000000', // PLACEHOLDER
  whatsapp: WHATSAPP_NUMBER,
  email: 'info@qalandariautos.pk', // PLACEHOLDER
  address: {
    line1: 'Shop # 00, Auto Parts Market', // PLACEHOLDER
    line2: 'Main Bazaar Road', // PLACEHOLDER
    city: 'Lahore', // PLACEHOLDER
    country: 'Pakistan',
  },
  /** Embedded map — replace with the shop's own Google Maps place. */
  mapsEmbedQuery: 'Auto Parts Market Lahore Pakistan', // PLACEHOLDER
  businessHours: [
    { days: 'Monday – Saturday', hours: '9:00 AM – 8:00 PM' },
    { days: 'Sunday', hours: 'Closed' },
  ],
  social: {
    facebook: 'https://facebook.com/', // PLACEHOLDER
    instagram: 'https://instagram.com/', // PLACEHOLDER
    youtube: 'https://youtube.com/', // PLACEHOLDER
  },

  /** Commerce settings. */
  currency: 'PKR',
  deliveryFee: 250,
  freeDeliveryOver: 5000,
  lowStockThreshold: 5,
  orderNumberPrefix: 'QAS-',
} as const;

export type SiteConfig = typeof siteConfig;
