import { siteConfig } from '@/config/site'

export interface PolicyPageContent {
  slug: string
  title: string
  body: string[]
}

export const policyPages: PolicyPageContent[] = [
  {
    slug: 'delivery-information',
    title: 'Delivery Information',
    body: [siteConfig.policies.delivery, 'Tracking details are shared by email and SMS once your order ships.'],
  },
  {
    slug: 'returns-exchanges',
    title: 'Returns & Exchanges',
    body: [siteConfig.policies.returns, `To start a return, contact us at ${siteConfig.contact.email} or ${siteConfig.contact.phone}.`],
  },
  {
    slug: 'jewellery-care',
    title: 'Jewellery Care',
    body: [siteConfig.policies.care],
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    body: [
      `${siteConfig.brandName} respects your privacy. [Editable placeholder: replace this section with your full privacy policy covering what customer data is collected, how it is used, and how customers can request deletion.]`,
    ],
  },
  {
    slug: 'terms-conditions',
    title: 'Terms & Conditions',
    body: [
      `[Editable placeholder: replace this section with your store's full terms & conditions covering orders, pricing, payments and liability.]`,
    ],
  },
]

export function getPolicy(slug: string) {
  return policyPages.find((p) => p.slug === slug)
}

export const faqs: { question: string; answer: string }[] = [
  {
    question: 'Do you deliver across Pakistan?',
    answer: 'Yes — we deliver nationwide through trusted courier partners, with complimentary delivery on orders above Rs. 10,000.',
  },
  {
    question: 'How long does delivery take?',
    answer: 'Orders are processed within 1–2 business days and typically arrive within 3–6 business days depending on your city.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'Cash on Delivery, Bank Transfer, Easypaisa and JazzCash today. Card payments are being integrated and will be available soon.',
  },
  {
    question: 'Can I return or exchange a product?',
    answer: 'Unworn, unused items in their original packaging can be returned or exchanged within 7 days of delivery. Bridal and custom orders are final sale.',
  },
  {
    question: 'Is the jewellery real gold?',
    answer: 'Our pieces use a mix of materials clearly listed on every product page — including gold-plated, 18K gold, sterling silver, rose gold, pearl and diamond-accent options.',
  },
  {
    question: 'Do you offer gift packaging?',
    answer: 'Every order arrives in Swabi Jewellers signature gift-ready packaging at no extra cost.',
  },
]
