/**
 * Single source of truth for business information.
 *
 * Every value marked PLACEHOLDER must be replaced with the real business
 * detail before going live. Nothing else in the codebase hardcodes a phone
 * number or address — change it here and it changes everywhere.
 */

export const siteConfig = {
  name: 'Qalandari Autos & Spare Parts',
  shortName: 'Qalandari Autos',
  tagline: 'Quality Motorcycle Spare Parts at the Right Price',
  description:
    'Motorcycle spare parts and accessories for Honda, Yamaha, Suzuki, United, Road Prince and Super Power bikes. Engine, electrical, brake, suspension and chain parts with cash on delivery across Pakistan.',

  /** Contact details — the ones marked PLACEHOLDER still need confirming. */
  phone: '0300-2389772',
  phoneHref: 'tel:+923002389772',
  email: 'info@qalandariautos.pk', // PLACEHOLDER
  address: {
    line1: '1/C Hajrabad',
    line2: 'Shah Faisal Colony, Korangi',
    city: 'Karachi',
    country: 'Pakistan',
  },
  /** Embedded map and the "open in Google Maps" link both search this. */
  mapsEmbedQuery: '1/C Hajrabad, Shah Faisal Colony, Korangi, Karachi',
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
