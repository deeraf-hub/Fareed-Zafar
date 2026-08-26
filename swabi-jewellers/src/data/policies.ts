import { siteConfig } from '@/config/site'

export interface PolicySection {
  heading: string
  body: string[]
}

export interface Policy {
  path: string
  title: string
  eyebrow: string
  intro: string
  sections: PolicySection[]
}

const { commerce, contact } = siteConfig

/** Customer-care content. Plain data so it can move to a CMS without touching the UI. */
export const policies: Policy[] = [
  {
    path: '/delivery',
    title: 'Delivery Information',
    eyebrow: 'Customer care',
    intro:
      'We deliver across Pakistan through trusted courier partners, with tracking shared as soon as your parcel leaves us.',
    sections: [
      {
        heading: 'Charges',
        body: [
          `Delivery is complimentary on orders above Rs. ${commerce.freeDeliveryThreshold.toLocaleString()}.`,
          `A flat delivery fee of Rs. ${commerce.deliveryFee} applies to orders below that amount.`,
        ],
      },
      {
        heading: 'Timelines',
        body: [
          commerce.dispatchCopy,
          'Karachi orders usually arrive within 2 working days; other cities take 3–5 working days.',
          'Orders placed on Sunday or a public holiday are dispatched the next working day.',
        ],
      },
      {
        heading: 'Tracking',
        body: [
          'You will receive a confirmation call, followed by a tracking number by SMS once your parcel is collected.',
          `For anything urgent, call the shop on ${contact.phone}.`,
        ],
      },
    ],
  },
  {
    path: '/returns',
    title: 'Returns & Exchanges',
    eyebrow: 'Customer care',
    intro: `Unworn pieces can be returned or exchanged within ${commerce.returnWindowDays} days of delivery.`,
    sections: [
      {
        heading: 'What we accept',
        body: [
          'Pieces must be unworn, undamaged and in their original packaging with all tags and pouches.',
          'Engraved pieces and custom colour-matched bridal orders are final sale.',
        ],
      },
      {
        heading: 'How to start a return',
        body: [
          `Call or WhatsApp the shop on ${contact.phone} with your order number within ${commerce.returnWindowDays} days of delivery.`,
          'We will confirm the return address and arrange collection where a courier pickup is available.',
        ],
      },
      {
        heading: 'Refunds',
        body: [
          'Refunds are issued to the original payment method, or by bank transfer for cash-on-delivery orders, within 5–7 working days of the piece reaching us.',
          'Delivery charges are refunded only where the piece arrived damaged or incorrect.',
        ],
      },
    ],
  },
  {
    path: '/jewellery-care',
    title: 'Jewellery Care',
    eyebrow: 'Customer care',
    intro:
      'Plated jewellery keeps its finish for years when it is treated gently. A few habits make all the difference.',
    sections: [
      {
        heading: 'Every day',
        body: [
          'Put your jewellery on last when you dress, after perfume, hairspray and lotion have dried.',
          'Take it off before sleeping, exercising, swimming, washing up or showering.',
        ],
      },
      {
        heading: 'After wear',
        body: [
          'Wipe each piece with the soft cloth provided to lift oils and moisture from the surface.',
          'Never use liquid jewellery cleaner, toothpaste or a brush on plated pieces — they strip the finish.',
        ],
      },
      {
        heading: 'Storage',
        body: [
          'Store each piece separately in its pouch, away from damp and direct sunlight.',
          'Keep pearl strands lying flat rather than hanging, so the thread does not stretch.',
        ],
      },
    ],
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    eyebrow: 'Legal',
    intro:
      'This is a template privacy policy for the Swabi Jewellers storefront. Review it with your own legal adviser before publishing.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Order information you provide at checkout: name, email address, phone number and delivery address.',
          'Basic technical information such as device type and pages visited, used to improve the store.',
        ],
      },
      {
        heading: 'How it is used',
        body: [
          'To process, pack and deliver your order, and to contact you about it.',
          'To send collection updates and offers, where you have asked to receive them. You can unsubscribe at any time.',
        ],
      },
      {
        heading: 'Sharing and storage',
        body: [
          'Your details are shared only with the courier delivering your order and any payment provider you choose.',
          `To ask what we hold, or to have it deleted, contact ${contact.email}.`,
        ],
      },
    ],
  },
  {
    path: '/terms',
    title: 'Terms & Conditions',
    eyebrow: 'Legal',
    intro:
      'These template terms cover use of the Swabi Jewellers storefront. Review them with your own legal adviser before publishing.',
    sections: [
      {
        heading: 'Orders',
        body: [
          'An order is confirmed once we have verified it by phone. We may cancel an order where a piece is no longer available, and any payment taken is refunded in full.',
          'Prices are shown in Pakistani Rupees and include applicable taxes.',
        ],
      },
      {
        heading: 'Products',
        body: [
          'All pieces are imitation jewellery — gold- and silver-plated brass or alloy, set with American diamond, zircon, kundan-style and shell-pearl elements. They are not solid gold, silver or precious stone.',
          'Photography and colour may vary slightly from the piece you receive because of screen settings and hand finishing.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'Our liability for any order is limited to the value of that order.',
          'These terms are governed by the laws of Pakistan.',
        ],
      },
    ],
  },
]

export function getPolicy(path: string): Policy | undefined {
  return policies.find((policy) => policy.path === path)
}
