import { siteConfig } from '../config/site';

/**
 * Policy copy lives here so the business can edit it without touching page
 * components. It describes ordinary online-shop practice — confirm the details
 * with the business and adjust before launch.
 */
export interface PolicySection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PolicyPage {
  slug: string;
  title: string;
  intro: string;
  sections: PolicySection[];
}

export const policies: Record<string, PolicyPage> = {
  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    intro: `This policy explains what information ${siteConfig.name} collects when you order, and how it is used.`,
    sections: [
      {
        heading: 'Information we collect',
        paragraphs: ['We collect only what is needed to deliver an order and to answer your questions:'],
        bullets: [
          'Your name, mobile number and delivery address, entered at checkout.',
          'Your email address, if you choose to provide one.',
          'The products you ordered and the order total.',
          'Messages you send us by phone or by email.',
        ],
      },
      {
        heading: 'How your information is used',
        paragraphs: [
          'Your details are used to confirm the order, pack it, hand it to the courier and contact you if something needs clarifying — for example, if a part does not fit the bike model you mentioned.',
          'We do not sell customer information. It is shared only with the courier company handling your delivery.',
        ],
      },
      {
        heading: 'Storage on this website',
        paragraphs: [
          'Your cart is stored in your own browser so it survives a page refresh. Clearing your browser data removes it.',
        ],
      },
      {
        heading: 'Your choices',
        paragraphs: [
          `Contact us at ${siteConfig.email} or by phone to ask what information we hold about an order, or to ask us to remove it once the order is complete.`,
        ],
      },
    ],
  },

  'terms-and-conditions': {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    intro: `These terms cover orders placed with ${siteConfig.name} through this website or by phone.`,
    sections: [
      {
        heading: 'Orders',
        paragraphs: [
          'Placing an order is a request to buy. We confirm it by phone before dispatch. An order is accepted once we have confirmed stock and your delivery address.',
          'We may cancel an order if the item is no longer available, if the address cannot be reached by our courier, or if the order cannot be confirmed with the customer.',
        ],
      },
      {
        heading: 'Prices and payment',
        paragraphs: [
          'Prices are shown in Pakistani Rupees (PKR) and include the delivery charge shown separately at checkout. Prices can change, but the price confirmed for your order is the price you pay.',
          'Cash on delivery is currently the payment method available. Other methods will be listed here when they are enabled.',
        ],
      },
      {
        heading: 'Fitment and compatibility',
        paragraphs: [
          'Each product lists the motorcycles it is intended to fit. Model years and previous repairs can vary, so if you are unsure, contact us with your bike model before ordering and we will confirm.',
        ],
      },
      {
        heading: 'Use of this website',
        paragraphs: [
          'Product descriptions and images are provided to help you identify the correct part. Illustrations may differ from the exact item supplied.',
        ],
      },
    ],
  },

  'shipping-policy': {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    intro: 'How orders are dispatched and delivered.',
    sections: [
      {
        heading: 'Delivery charges',
        paragraphs: [
          `A flat delivery charge of PKR ${siteConfig.deliveryFee} applies to orders below PKR ${siteConfig.freeDeliveryOver.toLocaleString('en-PK')}. Orders at or above PKR ${siteConfig.freeDeliveryOver.toLocaleString('en-PK')} are delivered free.`,
        ],
      },
      {
        heading: 'Dispatch and delivery time',
        paragraphs: [
          'Orders confirmed on a working day are normally packed the same or the next working day. Delivery usually takes 2–4 working days depending on your city, and may take longer for remote areas or during public holidays.',
          'You can follow the order on the Track Order page using your order number and mobile number.',
        ],
      },
      {
        heading: 'Receiving your order',
        paragraphs: [
          'Please check the parts in front of the courier where possible. If the packet is damaged or the item is clearly wrong, contact us the same day and we will resolve it.',
        ],
      },
      {
        heading: 'Failed deliveries',
        paragraphs: [
          'If the courier cannot reach you after repeated attempts, the parcel is returned to us. We will contact you to arrange a re-delivery.',
        ],
      },
    ],
  },

  'return-policy': {
    slug: 'return-policy',
    title: 'Return Policy',
    intro: 'When a spare part can be returned or exchanged.',
    sections: [
      {
        heading: 'Returns and exchanges',
        paragraphs: [
          'If a part is wrong, damaged in transit or does not fit the bike model listed on the product page, contact us within 7 days of delivery. We will exchange it or arrange a refund of the item price once the part is returned.',
        ],
      },
      {
        heading: 'Condition of returned parts',
        paragraphs: ['To be accepted for return, a part must be:'],
        bullets: [
          'Unused and unfitted, with no marks from installation.',
          'In its original packaging with any seals intact.',
          'Returned with the order number so we can match it to your order.',
        ],
      },
      {
        heading: 'What cannot be returned',
        paragraphs: [
          'Electrical items that have been fitted or wired cannot be returned unless they were faulty on arrival. Oils and consumables cannot be returned once opened. Parts damaged by incorrect fitting are not covered.',
        ],
      },
      {
        heading: 'How to start a return',
        paragraphs: [
          `Call the shop or email ${siteConfig.email} with your order number, the part and a photo. We will confirm the next step and the return address.`,
        ],
      },
    ],
  },
};
