import type { ImageAsset } from '@/types'

/**
 * Homepage and content-page copy. Kept here so a CMS or admin dashboard can own
 * banners, editorial sections and social imagery without touching components.
 */

export const heroSlide = {
  eyebrow: 'Swabi Jewellers · Karachi',
  headline: 'Timeless Jewellery. Made to Be Remembered.',
  subheadline:
    'Discover elegant jewellery crafted to celebrate your most beautiful moments.',
  primaryCta: { label: 'Shop Collection', href: '/shop' },
  secondaryCta: { label: 'Explore New Arrivals', href: '/new-arrivals' },
  image: {
    id: 'hero-main',
    src: '',
    alt: 'Model wearing a gold necklace, matching earrings and a bracelet from Swabi Jewellers',
    motif: 'model-portrait',
    tone: 'sand',
    prompt:
      'Full-bleed luxury jewellery campaign photograph: elegant South Asian female fashion model wearing a statement gold necklace, matching drop earrings, a bracelet and rings. Premium editorial fashion photography, soft warm studio lighting, ivory and sand backdrop, jewellery in sharp focus, natural skin texture, tasteful and sophisticated, shot for a high-end jewellery brand advertisement.',
  } satisfies ImageAsset,
  secondaryImage: {
    id: 'hero-detail',
    src: '',
    alt: 'Close-up of a gold and pearl necklace resting on ivory silk',
    motif: 'necklace',
    tone: 'champagne',
    prompt:
      'Macro still life of a gold and pearl necklace resting on ivory silk, single soft light source, deep detail on the metalwork, luxury brand product photography.',
  } satisfies ImageAsset,
}

export const editorialSplit = {
  eyebrow: 'The Atelier',
  headline: 'Jewellery That Tells Your Story',
  body: 'From everyday elegance to unforgettable celebrations, discover pieces designed to become part of your story.',
  cta: { label: 'Discover the Collection', href: '/collections' },
  image: {
    id: 'editorial-split',
    src: '',
    alt: 'Model in profile wearing a statement necklace and matching earrings',
    motif: 'model-portrait',
    tone: 'champagne',
    prompt:
      'Editorial half-profile portrait of an elegant South Asian female model wearing a statement gold necklace and matching earrings, champagne-toned studio backdrop, luxury fashion campaign lighting, jewellery clearly visible, refined and tasteful.',
  } satisfies ImageAsset,
}

export const bridalFeature = {
  eyebrow: 'Bridal',
  headline: 'For Your Most Beautiful Day',
  body: 'Complete bridal suites in kundan-style work — rani haar, jhumkas, matha patti, kangan and rings — balanced for comfort and made to photograph beautifully from every angle.',
  points: [
    'Try the full suite at our Karachi shop before you decide',
    'Complete sets ready to ship, from Rs. 1,450 to Rs. 6,800',
    'Sizing, fitting and a pre-wedding polish included',
  ],
  cta: { label: 'Explore Bridal Collection', href: '/bridal' },
  image: {
    id: 'bridal-feature',
    src: '',
    alt: 'Pakistani bride wearing a complete traditional gold and kundan bridal set',
    motif: 'bridal-model',
    tone: 'blush',
    prompt:
      'Pakistani bridal jewellery campaign photograph: South Asian bride wearing a complete kundan bridal set — layered rani haar, jhumkas, matha patti, kangan and rings. Warm blush and gold styling, soft cinematic light, elegant and tasteful editorial pose, extremely high detail on the jewellery.',
  } satisfies ImageAsset,
}

/** The model-led story sections that carry the homepage between product blocks. */
export const modelStories: {
  id: string
  eyebrow: string
  headline: string
  body: string
  cta: { label: string; href: string }
  image: ImageAsset
  align: 'left' | 'right'
}[] = [
  {
    id: 'story-everyday',
    eyebrow: 'Everyday Luxe',
    headline: 'The Pieces You Never Take Off',
    body: 'Fine plated chains, small hoops and slim bands, finished to survive real days — school runs, long shifts, late dinners.',
    cta: { label: 'Shop Everyday Luxe', href: '/collections/everyday-luxe' },
    align: 'right',
    image: {
      id: 'story-everyday-img',
      src: '',
      alt: 'Modern woman wearing minimal everyday gold jewellery',
      motif: 'everyday-model',
      tone: 'ivory',
      prompt:
        'Modern minimalist fashion photograph of a woman wearing fine everyday gold jewellery — a thin chain, small hoops and a slim ring. Bright ivory studio, natural daylight quality, relaxed elegant pose, jewellery clearly visible, premium lifestyle brand photography.',
    },
  },
  {
    id: 'story-detail',
    eyebrow: 'In Detail',
    headline: 'Finished by Hand, Checked Twice',
    body: 'Every clasp is tested, every stone is re-seated, and every piece is polished again before it is boxed.',
    cta: { label: 'Our Craft', href: '/about' },
    align: 'left',
    image: {
      id: 'story-detail-img',
      src: '',
      alt: 'Close-up beauty shot of a model wearing gold earrings and a fine necklace',
      motif: 'model-closeup',
      tone: 'sand',
      prompt:
        'Beauty close-up fashion shot of a South Asian model wearing gold drop earrings and a fine necklace, cropped at the shoulders, warm sand backdrop, editorial lighting, sharp jewellery detail, natural skin texture, luxury campaign styling.',
    },
  },
  {
    id: 'story-hands',
    eyebrow: 'Rings & Bracelets',
    headline: 'Worn Where You Will See Them Most',
    body: 'Stacking bands, solitaires and cuffs chosen for how they sit together on the hand.',
    cta: { label: 'Shop Rings', href: '/shop/rings' },
    align: 'right',
    image: {
      id: 'story-hands-img',
      src: '',
      alt: 'Close-up hand shot showing stacked gold rings and a bracelet',
      motif: 'hand-shot',
      tone: 'blush',
      prompt:
        'Luxury close-up hand photograph showing stacked gold rings and a chain bracelet, elegant manicured hand resting on cream linen, soft directional light, macro jewellery detail, premium advertising photography.',
    },
  },
]

export const trustPoints = [
  {
    id: 'authentic',
    title: 'Authentic Quality',
    body: 'Carefully selected jewellery, checked against our quality standards before it is packed.',
    icon: 'certificate',
  },
  {
    id: 'secure',
    title: 'Secure Shopping',
    body: 'A safe, straightforward checkout with clear order confirmation at every step.',
    icon: 'shield',
  },
  {
    id: 'packaging',
    title: 'Premium Packaging',
    body: 'Every order arrives in a cream and gold gift box, ready to be given as it is.',
    icon: 'gift',
  },
  {
    id: 'delivery',
    title: 'Easy Delivery',
    body: 'Reliable delivery across Pakistan, with complimentary shipping over Rs. 10,000.',
    icon: 'truck',
  },
  {
    id: 'support',
    title: 'Customer Support',
    body: 'Friendly help before and after your purchase — sizing, care and returns included.',
    icon: 'support',
  },
] as const

export const socialGallery: ImageAsset[] = [
  {
    id: 'social-1',
    src: '',
    alt: 'Model wearing a layered gold necklace',
    motif: 'model-portrait',
    tone: 'ivory',
    prompt:
      'Instagram-style luxury jewellery portrait: model wearing a layered gold necklace, ivory background, natural light, elegant styling.',
  },
  {
    id: 'social-2',
    src: '',
    alt: 'Close-up of gold jhumka earrings',
    motif: 'earrings',
    tone: 'champagne',
    prompt:
      'Instagram still life of gold jhumka earrings on champagne silk, warm light, macro detail.',
  },
  {
    id: 'social-3',
    src: '',
    alt: 'Bride wearing a complete bridal jewellery set',
    motif: 'bridal-model',
    tone: 'blush',
    prompt:
      'Instagram bridal photograph: Pakistani bride in a complete kundan set, blush tones, tasteful editorial styling.',
  },
  {
    id: 'social-4',
    src: '',
    alt: 'Stacked gold rings on a hand',
    motif: 'hand-shot',
    tone: 'sand',
    prompt: 'Instagram hand shot of stacked gold rings, cream linen, soft daylight.',
  },
  {
    id: 'social-5',
    src: '',
    alt: 'Swabi Jewellers gift packaging',
    motif: 'packaging',
    tone: 'ivory',
    prompt: 'Instagram flat lay of cream and gold jewellery gift packaging with ribbon.',
  },
  {
    id: 'social-6',
    src: '',
    alt: 'Model wearing a pearl set at an evening event',
    motif: 'model-closeup',
    tone: 'navy',
    prompt:
      'Instagram evening portrait: model wearing a pearl and gold set, deep navy backdrop, cinematic light.',
  },
]

/** About page copy — placeholders, deliberately free of invented company history. */
export const aboutContent = {
  headline: 'Crafting Beauty, Creating Memories',
  intro:
    'Swabi Jewellers is a jewellery house built on three simple commitments: honest quality, careful craftsmanship, and looking after the customer long after the box is opened.',
  sections: [
    {
      id: 'story',
      title: 'Our Story',
      body: 'This space is reserved for the Swabi Jewellers story — when the business began, who started it, and the community it grew from. Replace this paragraph with your own history.',
    },
    {
      id: 'craft',
      title: 'Craftsmanship',
      body: 'Describe how your pieces are made here: the workshop, the techniques your karigars use, and the finishing steps that set your jewellery apart. This placeholder is ready for your words.',
    },
    {
      id: 'quality',
      title: 'Our Quality Promise',
      body: 'Set out your quality standards in this section — the plating thickness you work to, how stones are set and selected, and what guarantee comes with each purchase.',
    },
    {
      id: 'service',
      title: 'Looking After You',
      body: 'Explain the service you offer after a sale: sizing, re-polishing, repairs, bridal consultations and exchanges. Replace this text with your own commitments.',
    },
  ],
  image: {
    id: 'about-hero',
    src: '',
    alt: 'Model wearing a heritage gold set from Swabi Jewellers',
    motif: 'model-portrait',
    tone: 'champagne',
    prompt:
      'Editorial portrait of a South Asian model wearing a heritage gold jewellery set, warm champagne backdrop, luxury brand campaign photography, elegant and refined.',
  } satisfies ImageAsset,
}

export const faqs = [
  {
    question: 'How long does delivery take?',
    answer:
      'Orders are dispatched within 1–2 working days and usually arrive within 2–5 days across Pakistan. Delivery is complimentary on orders above Rs. 10,000.',
  },
  {
    question: 'Can I pay cash on delivery?',
    answer:
      'Yes. Cash on Delivery is available nationwide, along with bank transfer, Easypaisa and JazzCash. Card payment is coming soon.',
  },
  {
    question: 'Do you offer exchanges or returns?',
    answer:
      'Unworn pieces in their original packaging can be exchanged or returned within 7 days of delivery. Engraved and custom-coloured pieces are final sale.',
  },
  {
    question: 'How do I find my ring size?',
    answer:
      'Most of our rings come in sizes 6 to 9. Message or call us with the inner diameter of a ring you already wear and we will match it.',
  },
  {
    question: 'Do you make bridal sets to order?',
    answer:
      'Yes. Bridal suites are kept in stock and can be reserved for your date. Custom colour matching to your outfit takes about two weeks.',
  },
  {
    question: 'How should I care for my jewellery?',
    answer:
      'Plated jewellery lasts longest when it is kept dry. Store each piece in its pouch away from perfume and moisture, wipe it with the cloth provided after wear, and put it on last when you dress.',
  },
]
