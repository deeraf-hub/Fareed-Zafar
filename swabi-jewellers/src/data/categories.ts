import type { Category } from '@/types'

export const categories: Category[] = [
  {
    slug: 'necklaces',
    name: 'Necklaces',
    tagline: 'Chains, chokers & statement pieces',
    description:
      'From whisper-fine plated chains for everyday wear to statement collars made for celebration, our necklaces are chosen for balance, finish and the way they sit on the skin.',
    image: {
      id: 'cat-necklaces',
      src: '',
      alt: 'Model wearing a layered gold necklace from the Swabi Jewellers necklace collection',
      motif: 'necklace',
      tone: 'ivory',
      prompt:
        'Luxury jewellery campaign photograph of an elegant South Asian female model wearing a layered gold necklace, soft studio lighting, ivory backdrop, editorial fashion photography, jewellery in sharp focus, natural skin texture.',
    },
  },
  {
    slug: 'earrings',
    name: 'Earrings',
    tagline: 'Studs, drops & jhumkas',
    description:
      'Studs that disappear into everyday life, drops that catch the light across a room, and jhumkas made in the traditional way — all finished by hand.',
    image: {
      id: 'cat-earrings',
      src: '',
      alt: 'Close-up of gold drop earrings worn by a model',
      motif: 'earrings',
      tone: 'champagne',
      prompt:
        'Beauty close-up of a female model wearing gold drop earrings, sophisticated fashion editorial lighting, champagne background, high detail on the jewellery, tasteful and premium.',
    },
  },
  {
    slug: 'rings',
    name: 'Rings',
    tagline: 'Solitaires, bands & cocktail rings',
    description:
      'Rings for every day and for occasions — set with American diamond, zircon and coloured stones on gold- and rhodium-plated bands.',
    image: {
      id: 'cat-rings',
      src: '',
      alt: 'Close-up of a hand wearing a gold solitaire ring',
      motif: 'ring',
      tone: 'blush',
      prompt:
        'Elegant close-up hand shot showing a gold solitaire ring and a delicate band, soft blush background, luxury jewellery advertising photography, manicured hand, high detail.',
    },
  },
  {
    slug: 'bracelets',
    name: 'Bracelets',
    tagline: 'Chain, tennis & charm bracelets',
    description:
      'Weighted, well-clasped bracelets that move with the wrist — from fine plated chains to tennis lines set with AD stones.',
    image: {
      id: 'cat-bracelets',
      src: '',
      alt: 'Gold chain bracelet worn on a model wrist',
      motif: 'bracelet',
      tone: 'sand',
      prompt:
        'Luxury product and lifestyle photograph of a gold chain bracelet on a model wrist, warm sand background, studio lighting, premium jewellery campaign styling.',
    },
  },
  {
    slug: 'bangles',
    name: 'Bangles',
    tagline: 'Kara, kangan & stacking sets',
    description:
      'Traditional kangan, meenakari sets and modern stacking bangles, engraved and polished in the workshop and sized to sit comfortably.',
    image: {
      id: 'cat-bangles',
      src: '',
      alt: 'Set of engraved gold bangles',
      motif: 'bangle',
      tone: 'champagne',
      prompt:
        'Set of engraved gold bangles arranged on ivory silk, luxury still-life jewellery photography, warm directional light, exquisite detail on the engraving.',
    },
  },
  {
    slug: 'bridal-jewellery',
    name: 'Bridal Jewellery',
    tagline: 'For your most beautiful day',
    description:
      'Complete bridal sets — rani haar, jhumkas, matha patti, kangan and rings in kundan-style work — designed to photograph beautifully and stay comfortable through a long day.',
    image: {
      id: 'cat-bridal',
      src: '',
      alt: 'Pakistani bride wearing a full traditional bridal jewellery set',
      motif: 'bridal-model',
      tone: 'blush',
      prompt:
        'Pakistani bridal jewellery campaign: South Asian bride wearing a full kundan bridal set with matha patti, jhumkas and layered necklace, warm blush backdrop, tasteful editorial photography, elegant pose, jewellery clearly visible.',
    },
  },
  {
    slug: 'sets',
    name: 'Sets',
    tagline: 'Matched necklace & earring sets',
    description:
      'Considered pairings — necklace with matching earrings, sometimes a ring — so the whole look is decided in one purchase.',
    image: {
      id: 'cat-sets',
      src: '',
      alt: 'Matched gold necklace and earring set displayed on cream fabric',
      motif: 'set',
      tone: 'ivory',
      prompt:
        'Matched gold necklace and earring set laid on cream silk, luxury still-life jewellery photography, soft shadows, premium brand advertisement.',
    },
  },
  {
    slug: 'new-arrivals',
    name: 'New Arrivals',
    tagline: 'The latest from the workshop',
    description: 'The newest pieces to join the collection, added as they leave the workshop.',
    virtual: true,
    image: {
      id: 'cat-new',
      src: '',
      alt: 'Model wearing the newest Swabi Jewellers pieces',
      motif: 'model-portrait',
      tone: 'sand',
      prompt:
        'Fashion editorial portrait of an elegant South Asian model wearing new-season gold jewellery, minimal sand-toned studio set, luxury brand campaign photography.',
    },
  },
]

export const shoppableCategories = categories.filter((category) => !category.virtual)

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug)
}
