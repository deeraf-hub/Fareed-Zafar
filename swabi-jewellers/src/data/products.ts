import type { CategorySlug, ImageAsset, Material, MotifKind, Product } from '@/types'

/**
 * Demo catalogue.
 *
 * These are placeholder products so the storefront can be reviewed end to end.
 * They are deliberately kept out of the UI components: an admin dashboard or a
 * `/api/products` endpoint can replace this module and nothing else has to change.
 */

type ProductCategory = Exclude<CategorySlug, 'new-arrivals'>

interface ProductSeed {
  name: string
  category: ProductCategory
  collection: string
  price: number
  compareAtPrice?: number
  materials: Material[]
  description: string
  weight: string
  dimensions: string
  finish: string
  stones: string
  rating: number
  reviewCount: number
  stock: number
  createdAt: string
  isNew?: boolean
  isFeatured?: boolean
  isBestSeller?: boolean
  badges?: string[]
  tones?: ImageAsset['tone'][]
}

const CATEGORY_MOTIF: Record<ProductCategory, MotifKind> = {
  necklaces: 'necklace',
  earrings: 'earrings',
  rings: 'ring',
  bracelets: 'bracelet',
  bangles: 'bangle',
  'bridal-jewellery': 'set',
  sets: 'set',
}

const CATEGORY_MODEL_MOTIF: Record<ProductCategory, MotifKind> = {
  necklaces: 'model-portrait',
  earrings: 'model-closeup',
  rings: 'hand-shot',
  bracelets: 'hand-shot',
  bangles: 'hand-shot',
  'bridal-jewellery': 'bridal-model',
  sets: 'model-portrait',
}

const CATEGORY_NOUN: Record<ProductCategory, string> = {
  necklaces: 'necklace',
  earrings: 'earrings',
  rings: 'ring',
  bracelets: 'bracelet',
  bangles: 'bangles',
  'bridal-jewellery': 'bridal set',
  sets: 'jewellery set',
}

const DEFAULT_CARE =
  'Plated jewellery keeps its finish longest when it stays dry. Store each piece in the pouch provided, away from perfume, deodorant and moisture, and wipe it gently with the enclosed cloth after wear. Put your jewellery on last when dressing, and remove it before swimming, sleeping or washing.'

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildImages(seed: ProductSeed): ImageAsset[] {
  const slug = slugify(seed.name)
  const motif = CATEGORY_MOTIF[seed.category]
  const modelMotif = CATEGORY_MODEL_MOTIF[seed.category]
  const noun = CATEGORY_NOUN[seed.category]
  const tones = seed.tones ?? ['ivory', 'champagne', 'sand']
  const materials = seed.materials.join(', ').toLowerCase()

  return [
    {
      id: `${slug}-1`,
      src: '',
      alt: `${seed.name} — ${materials} ${noun} by Swabi Jewellers`,
      motif,
      tone: tones[0],
      prompt: `Luxury product photograph of the ${seed.name}, a ${materials} ${noun}, on an ivory silk surface, soft directional studio light, macro detail, premium jewellery brand advertisement.`,
    },
    {
      id: `${slug}-2`,
      src: '',
      alt: `${seed.name} shown from a second angle`,
      motif,
      tone: tones[1] ?? 'champagne',
      prompt: `Second-angle studio photograph of the ${seed.name} ${noun}, three-quarter view on a champagne background, reflective highlights, high detail.`,
    },
    {
      id: `${slug}-3`,
      src: '',
      alt: `Model wearing the ${seed.name}`,
      motif: modelMotif,
      tone: tones[2] ?? 'sand',
      prompt: `Elegant South Asian female model wearing the ${seed.name} ${noun}, luxury fashion editorial photography, soft studio lighting, natural skin texture, jewellery in sharp focus, tasteful premium styling.`,
    },
    {
      id: `${slug}-4`,
      src: '',
      alt: `${seed.name} presented in Swabi Jewellers packaging`,
      motif: 'packaging',
      tone: 'ivory',
      prompt: `The ${seed.name} presented in a cream and gold Swabi Jewellers gift box with ribbon, luxury packaging still life, warm light.`,
    },
  ]
}

function toProduct(seed: ProductSeed): Product {
  const slug = slugify(seed.name)
  const badges = [...(seed.badges ?? [])]
  if (seed.compareAtPrice && !badges.includes('Sale')) badges.push('Sale')
  if (seed.isNew && !badges.includes('New')) badges.push('New')

  return {
    id: slug,
    slug,
    name: seed.name,
    category: seed.category,
    collection: seed.collection,
    price: seed.price,
    compareAtPrice: seed.compareAtPrice,
    materials: seed.materials,
    description: seed.description,
    details: {
      weight: seed.weight,
      dimensions: seed.dimensions,
      finish: seed.finish,
      stones: seed.stones,
    },
    care: DEFAULT_CARE,
    images: buildImages(seed),
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    inStock: seed.stock > 0,
    stock: seed.stock,
    badges,
    isNew: seed.isNew,
    isFeatured: seed.isFeatured,
    isBestSeller: seed.isBestSeller,
    createdAt: seed.createdAt,
  }
}

const seeds: ProductSeed[] = [
  {
    name: 'Royal Pearl Necklace',
    category: 'necklaces',
    collection: 'Pearl Atelier',
    price: 2850,
    compareAtPrice: 3600,
    materials: ['Faux Pearl', 'Gold Plated'],
    description:
      'A double strand of hand-knotted shell pearls on a gold-plated clasp, finished with a single pearl drop. Graduated in size so the strand sits evenly at the collarbone.',
    weight: '46 g',
    dimensions: '42 cm strand · 5 cm extender',
    finish: 'Gold-plated brass with lustre-matched shell pearls',
    stones: 'Shell pearls, 6–8 mm',
    rating: 4.9,
    reviewCount: 128,
    stock: 24,
    createdAt: '2026-07-28',
    isFeatured: true,
    isBestSeller: true,
    tones: ['ivory', 'champagne', 'blush'],
  },
  {
    name: 'Noor Gold Earrings',
    category: 'earrings',
    collection: 'Noor',
    price: 1450,
    materials: ['Gold Plated', 'Brass Alloy'],
    description:
      'Fluted gold-plated drops that catch light from every angle, hung from a secure hypoallergenic post. Light enough for a full day, striking enough for an evening.',
    weight: '14 g (pair)',
    dimensions: '3.4 cm drop · 1.6 cm width',
    finish: 'Brushed and polished 18K gold plating',
    stones: 'None',
    rating: 4.8,
    reviewCount: 96,
    stock: 40,
    createdAt: '2026-08-12',
    isNew: true,
    isFeatured: true,
    isBestSeller: true,
    tones: ['champagne', 'ivory', 'sand'],
  },
  {
    name: 'Meher Ring',
    category: 'rings',
    collection: 'Meher',
    price: 1150,
    compareAtPrice: 1500,
    materials: ['Gold Plated', 'AD Stones'],
    description:
      'A slim plated band that lifts into a cluster of pavé-set American diamond stones. Designed to stack with a plain band or wear on its own.',
    weight: '4 g',
    dimensions: 'Band 2 mm · head 8 mm · sizes 6–9',
    finish: 'Mirror-polished gold plating',
    stones: '17 round AD stones, prong set',
    rating: 4.7,
    reviewCount: 74,
    stock: 30,
    createdAt: '2026-08-06',
    isNew: true,
    isFeatured: true,
    tones: ['blush', 'ivory', 'champagne'],
  },
  {
    name: 'Zarina Bracelet',
    category: 'bracelets',
    collection: 'Zarina',
    price: 1250,
    materials: ['Gold Plated', 'Brass Alloy'],
    description:
      'An oval-link chain bracelet with a hidden box clasp and safety catch. Weighted so it drapes across the wrist rather than sliding.',
    weight: '18 g',
    dimensions: '18 cm · 6 mm links',
    finish: 'Polished plating with matte link facets',
    stones: 'None',
    rating: 4.8,
    reviewCount: 61,
    stock: 34,
    createdAt: '2026-08-09',
    isNew: true,
    isBestSeller: true,
    tones: ['sand', 'ivory', 'champagne'],
  },
  {
    name: 'Swabi Heritage Set',
    category: 'sets',
    collection: 'Swabi Heritage',
    price: 4500,
    compareAtPrice: 5400,
    materials: ['Kundan Style', 'Gold Plated', 'Faux Pearl'],
    description:
      'A heritage collar with matching jhumkas, hand-set with kundan-style stones in the traditional way. The centrepiece is assembled by hand, stone by stone.',
    weight: '128 g (set)',
    dimensions: 'Collar 40 cm · jhumka 5.2 cm drop',
    finish: 'Antique gold plating with hand-set stones',
    stones: 'Kundan-style glass stones with pearl drops',
    rating: 5,
    reviewCount: 42,
    stock: 12,
    createdAt: '2026-07-19',
    isFeatured: true,
    isBestSeller: true,
    badges: ['Handcrafted'],
    tones: ['champagne', 'navy', 'blush'],
  },
  {
    name: 'Roshan Solitaire Ring',
    category: 'rings',
    collection: 'Roshan',
    price: 1350,
    materials: ['Rhodium Plated', 'AD Stones'],
    description:
      'A single brilliant-cut American diamond stone held in a four-claw setting on a tapered band — the quietest way to mark something important.',
    weight: '4 g',
    dimensions: 'Band 1.9 mm · stone 6 mm · sizes 6–9',
    finish: 'Rhodium plating over brass',
    stones: 'Brilliant-cut AD solitaire',
    rating: 4.9,
    reviewCount: 57,
    stock: 26,
    createdAt: '2026-07-31',
    isFeatured: true,
    isBestSeller: true,
    tones: ['ivory', 'blush', 'sand'],
  },
  {
    name: 'Mahira Necklace',
    category: 'necklaces',
    collection: 'Noor',
    price: 1650,
    materials: ['Gold Plated', 'Zircon'],
    description:
      'A fine plated chain with an off-centre zircon pendant. Made to be layered with longer chains or worn on its own under a collar.',
    weight: '12 g',
    dimensions: '40 cm · 5 cm extender',
    finish: '18K gold plating over brass',
    stones: 'Single round zircon, 4 mm',
    rating: 4.6,
    reviewCount: 88,
    stock: 45,
    createdAt: '2026-08-14',
    isNew: true,
    tones: ['ivory', 'sand', 'champagne'],
  },
  {
    name: 'Aiza Pearl Earrings',
    category: 'earrings',
    collection: 'Pearl Atelier',
    price: 550,
    compareAtPrice: 750,
    materials: ['Faux Pearl', 'Silver Plated'],
    description:
      'A single round shell pearl on a silver-plated post with a comfort back. The everyday earring — the one that stays in.',
    weight: '5 g (pair)',
    dimensions: '8 mm pearl',
    finish: 'Rhodium-toned silver plating',
    stones: 'Shell pearl, 8 mm',
    rating: 4.7,
    reviewCount: 143,
    stock: 80,
    createdAt: '2026-08-16',
    isNew: true,
    isBestSeller: true,
    tones: ['blush', 'ivory', 'sand'],
  },
  {
    name: 'Gulnar Bridal Set',
    category: 'bridal-jewellery',
    collection: 'Bridal Couture',
    price: 6800,
    compareAtPrice: 7900,
    materials: ['Kundan Style', 'Gold Plated', 'Faux Pearl'],
    description:
      'The full bridal suite: layered rani haar, jhumkas, matha patti, a pair of kangan and a ring — balanced so the weight is carried comfortably through a long day.',
    weight: '410 g (complete set)',
    dimensions: 'Rani haar 46 cm · jhumka 6 cm drop',
    finish: 'Antique gold plating with hand-set stones and pearl drops',
    stones: 'Kundan-style stones and shell pearls',
    rating: 5,
    reviewCount: 31,
    stock: 8,
    createdAt: '2026-07-04',
    isFeatured: true,
    badges: ['Complete Set'],
    tones: ['blush', 'champagne', 'navy'],
  },
  {
    name: 'Sana Kundan Choker',
    category: 'necklaces',
    collection: 'Bridal Couture',
    price: 4900,
    materials: ['Kundan Style', 'Gold Plated'],
    description:
      'A structured kundan-style choker with a scalloped edge and pearl fringe, sized to sit high on the neck for mehndi and nikkah looks.',
    weight: '156 g',
    dimensions: '34 cm · 4.8 cm at centre',
    finish: 'Antique gold plating',
    stones: 'Kundan-style stones with pearl fringe',
    rating: 4.9,
    reviewCount: 26,
    stock: 10,
    createdAt: '2026-07-22',
    tones: ['navy', 'champagne', 'blush'],
  },
  {
    name: 'Hina Jhumka Earrings',
    category: 'earrings',
    collection: 'Swabi Heritage',
    price: 1850,
    materials: ['Gold Plated', 'Faux Pearl'],
    description:
      'Domed jhumkas with a pearl fringe and a filigree cap, made the traditional way and finished by hand.',
    weight: '26 g (pair)',
    dimensions: '5.4 cm drop · 2.6 cm dome',
    finish: 'Antique gold filigree plating',
    stones: 'Seed shell pearls',
    rating: 4.8,
    reviewCount: 67,
    stock: 28,
    createdAt: '2026-07-27',
    isBestSeller: true,
    tones: ['champagne', 'sand', 'blush'],
  },
  {
    name: 'Laila Tennis Bracelet',
    category: 'bracelets',
    collection: 'Roshan',
    price: 2450,
    compareAtPrice: 2950,
    materials: ['Rhodium Plated', 'AD Stones'],
    description:
      'A continuous line of prong-set American diamond stones with a double-lock clasp — the piece that lifts everything else you are wearing.',
    weight: '22 g',
    dimensions: '18.5 cm · 3 mm line',
    finish: 'Rhodium plating',
    stones: '52 round AD stones',
    rating: 4.8,
    reviewCount: 54,
    stock: 20,
    createdAt: '2026-08-02',
    isFeatured: true,
    tones: ['ivory', 'champagne', 'sand'],
  },
  {
    name: 'Amber Kangan Pair',
    category: 'bangles',
    collection: 'Swabi Heritage',
    price: 2650,
    materials: ['Gold Plated', 'Brass Alloy'],
    description:
      'A pair of engraved kangan with a hinged opening and box clasp. The engraving is cut by hand, so no two pairs are quite identical.',
    weight: '86 g (pair)',
    dimensions: '6.2 cm inner diameter · 12 mm width',
    finish: 'Hand-engraved, lightly antiqued plating',
    stones: 'None',
    rating: 4.9,
    reviewCount: 38,
    stock: 16,
    createdAt: '2026-07-16',
    isBestSeller: true,
    badges: ['Handcrafted'],
    tones: ['champagne', 'sand', 'ivory'],
  },
  {
    name: 'Sitara Stacking Bangles',
    category: 'bangles',
    collection: 'Everyday Luxe',
    price: 1100,
    compareAtPrice: 1450,
    materials: ['Gold Plated'],
    description:
      'A set of four slim bangles in mixed finishes — plain, twisted, beaded and engraved — meant to be worn together.',
    weight: '44 g (set of four)',
    dimensions: '6.4 cm inner diameter · 3 mm width',
    finish: 'Mixed brushed and polished plating',
    stones: 'None',
    rating: 4.5,
    reviewCount: 91,
    stock: 42,
    createdAt: '2026-08-11',
    isNew: true,
    tones: ['sand', 'ivory', 'champagne'],
  },
  {
    name: 'Anaya Everyday Chain',
    category: 'necklaces',
    collection: 'Everyday Luxe',
    price: 650,
    materials: ['Gold Plated'],
    description:
      'A 1.8 mm rope chain with a lobster clasp — the base layer for everything else in your jewellery box.',
    weight: '9 g',
    dimensions: '45 cm · 1.8 mm',
    finish: '18K gold plating over stainless steel',
    stones: 'None',
    rating: 4.6,
    reviewCount: 156,
    stock: 90,
    createdAt: '2026-08-18',
    isNew: true,
    isBestSeller: true,
    tones: ['ivory', 'sand', 'champagne'],
  },
  {
    name: 'Rida Solitaire Studs',
    category: 'earrings',
    collection: 'Roshan',
    price: 950,
    materials: ['Rhodium Plated', 'AD Stones'],
    description:
      'Matched brilliant-cut American diamond stones in four-claw settings with screw backs, so they stay exactly where you put them.',
    weight: '4 g (pair)',
    dimensions: '6 mm stones',
    finish: 'Rhodium plating',
    stones: 'Brilliant-cut AD stones',
    rating: 4.9,
    reviewCount: 49,
    stock: 55,
    createdAt: '2026-07-25',
    isFeatured: true,
    tones: ['ivory', 'blush', 'sand'],
  },
  {
    name: 'Zoya Pearl Drop Set',
    category: 'sets',
    collection: 'Pearl Atelier',
    price: 2750,
    materials: ['Faux Pearl', 'Gold Plated'],
    description:
      'A pearl pendant on a fine plated chain with matching drop earrings — a complete look for nikkah, walima guests and evening events.',
    weight: '38 g (set)',
    dimensions: 'Chain 42 cm · earring 2.8 cm drop',
    finish: 'Polished gold plating',
    stones: 'Shell pearls, 9 mm',
    rating: 4.8,
    reviewCount: 63,
    stock: 22,
    createdAt: '2026-08-04',
    isFeatured: true,
    tones: ['blush', 'ivory', 'champagne'],
  },
  {
    name: 'Nashwa Choker',
    category: 'necklaces',
    collection: 'Meher',
    price: 2200,
    materials: ['Gold Plated', 'Zircon'],
    description:
      'A flat herringbone choker with a zircon-set bar at the centre. Sits close to the neck and lies completely flat.',
    weight: '34 g',
    dimensions: '36 cm · 6 mm width',
    finish: 'Mirror-polish plating',
    stones: '9 baguette zircon',
    rating: 4.7,
    reviewCount: 44,
    stock: 25,
    createdAt: '2026-08-08',
    isNew: true,
    tones: ['navy', 'ivory', 'sand'],
  },
  {
    name: 'Areeba Hoop Earrings',
    category: 'earrings',
    collection: 'Everyday Luxe',
    price: 890,
    compareAtPrice: 1150,
    materials: ['Gold Plated'],
    description:
      'Medium hoops with a squared profile and a click-lock closure — light enough to forget you are wearing them.',
    weight: '8 g (pair)',
    dimensions: '3 cm diameter · 2.5 mm profile',
    finish: 'Polished 18K gold plating',
    stones: 'None',
    rating: 4.6,
    reviewCount: 117,
    stock: 60,
    createdAt: '2026-08-13',
    isNew: true,
    isBestSeller: true,
    tones: ['sand', 'champagne', 'ivory'],
  },
  {
    name: 'Falak Cocktail Ring',
    category: 'rings',
    collection: 'Meher',
    price: 1750,
    materials: ['Gold Plated', 'AD Stones'],
    description:
      'An oval cocktail ring with a halo of small stones around a deep centre stone — designed to be seen across a table.',
    weight: '9 g',
    dimensions: 'Head 14 × 11 mm · sizes 6–9',
    finish: 'Polished plating with milgrain edge',
    stones: 'Oval centre stone with AD halo',
    rating: 4.7,
    reviewCount: 36,
    stock: 24,
    createdAt: '2026-07-30',
    tones: ['navy', 'champagne', 'blush'],
  },
  {
    name: 'Inaya Charm Bracelet',
    category: 'bracelets',
    collection: 'Everyday Luxe',
    price: 850,
    materials: ['Silver Plated', 'Enamel'],
    description:
      'A fine curb chain with three small charms — a crescent, an evil eye and a solid disc that can be engraved on request.',
    weight: '11 g',
    dimensions: '17.5 cm · 2 cm extender',
    finish: 'Rhodium-toned silver plating',
    stones: 'Enamel detail on the evil eye charm',
    rating: 4.5,
    reviewCount: 72,
    stock: 46,
    createdAt: '2026-08-15',
    isNew: true,
    badges: ['Engravable'],
    tones: ['ivory', 'blush', 'sand'],
  },
  {
    name: 'Bano Bridal Jhumkas',
    category: 'bridal-jewellery',
    collection: 'Bridal Couture',
    price: 3200,
    materials: ['Kundan Style', 'Gold Plated', 'Faux Pearl'],
    description:
      'Full-size bridal jhumkas with a supporting ear chain, so the weight is taken by the hair rather than the ear.',
    weight: '62 g (pair)',
    dimensions: '7.2 cm drop · 3.4 cm dome',
    finish: 'Antique gold plating with kundan-style stones',
    stones: 'Kundan-style stones with pearl fringe',
    rating: 4.9,
    reviewCount: 28,
    stock: 14,
    createdAt: '2026-07-11',
    isBestSeller: true,
    tones: ['blush', 'champagne', 'navy'],
  },
  {
    name: 'Marium Matha Patti',
    category: 'bridal-jewellery',
    collection: 'Bridal Couture',
    price: 1950,
    compareAtPrice: 2500,
    materials: ['Kundan Style', 'Gold Plated'],
    description:
      'A single-strand matha patti with a kundan-style centrepiece and adjustable side chains to suit any hairline.',
    weight: '36 g',
    dimensions: '32 cm chain · 4.2 cm centrepiece',
    finish: 'Antique gold plating',
    stones: 'Kundan-style stones',
    rating: 4.8,
    reviewCount: 22,
    stock: 18,
    createdAt: '2026-07-14',
    tones: ['champagne', 'blush', 'navy'],
  },
  {
    name: 'Hooriya Bridal Kangan',
    category: 'bangles',
    collection: 'Bridal Couture',
    price: 3900,
    materials: ['Kundan Style', 'Gold Plated'],
    description:
      'A pair of wide bridal kangan with kundan-style panels and a hinged opening — the anchor of a traditional bridal look.',
    weight: '182 g (pair)',
    dimensions: '6.2 cm inner diameter · 28 mm width',
    finish: 'Antique gold plating with stone panels',
    stones: 'Kundan-style stones',
    rating: 5,
    reviewCount: 19,
    stock: 9,
    createdAt: '2026-07-08',
    badges: ['Bridal'],
    tones: ['navy', 'champagne', 'blush'],
  },
  {
    name: 'Wardah Layered Necklace',
    category: 'necklaces',
    collection: 'Meher',
    price: 1950,
    compareAtPrice: 2400,
    materials: ['Gold Plated', 'Faux Pearl'],
    description:
      'Three chains on a single clasp — a fine rope, a satellite chain and a pearl strand — so layering stays tangle-free.',
    weight: '24 g',
    dimensions: '38 / 42 / 46 cm',
    finish: '18K gold plating',
    stones: 'Shell pearls, 4 mm',
    rating: 4.6,
    reviewCount: 79,
    stock: 32,
    createdAt: '2026-08-10',
    isNew: true,
    tones: ['ivory', 'sand', 'champagne'],
  },
  {
    name: 'Alishba Ear Cuffs',
    category: 'earrings',
    collection: 'Everyday Luxe',
    price: 500,
    materials: ['Silver Plated'],
    description:
      'Pierce-free cuffs with a shaped inner curve that grips gently — wear one, or stack two on the same ear.',
    weight: '3 g (pair)',
    dimensions: '1.4 cm · 2 mm band',
    finish: 'Brushed silver plating',
    stones: 'None',
    rating: 4.4,
    reviewCount: 64,
    stock: 75,
    createdAt: '2026-08-17',
    isNew: true,
    tones: ['sand', 'ivory', 'blush'],
  },
  {
    name: 'Nimra Eternity Band',
    category: 'rings',
    collection: 'Roshan',
    price: 1250,
    compareAtPrice: 1600,
    materials: ['Rhodium Plated', 'AD Stones'],
    description:
      'A half-eternity band of channel-set stones, shaped to sit flush against a solitaire.',
    weight: '4 g',
    dimensions: 'Band 2.4 mm · sizes 6–9',
    finish: 'Rhodium plating',
    stones: 'Channel-set AD stones',
    rating: 4.9,
    reviewCount: 41,
    stock: 28,
    createdAt: '2026-07-21',
    isFeatured: true,
    tones: ['ivory', 'champagne', 'blush'],
  },
  {
    name: 'Saira Signet Ring',
    category: 'rings',
    collection: 'Swabi Heritage',
    price: 990,
    materials: ['Gold Plated', 'Brass Alloy'],
    description:
      'A classic oval signet with a flat face, ready to be engraved with initials at our Karachi shop.',
    weight: '8 g',
    dimensions: 'Face 12 × 10 mm · sizes 6–10',
    finish: 'Satin face with polished shoulders',
    stones: 'None',
    rating: 4.7,
    reviewCount: 33,
    stock: 30,
    createdAt: '2026-07-26',
    badges: ['Engravable'],
    tones: ['champagne', 'sand', 'ivory'],
  },
  {
    name: 'Kiran Cuff Bracelet',
    category: 'bracelets',
    collection: 'Swabi Heritage',
    price: 1650,
    materials: ['Gold Plated', 'Brass Alloy'],
    description:
      'A wide open cuff with a hand-chased pattern across the face, slightly flexible so it can be adjusted at home.',
    weight: '38 g',
    dimensions: '16 mm width · adjustable',
    finish: 'Hand-chased, lightly antiqued plating',
    stones: 'None',
    rating: 4.8,
    reviewCount: 29,
    stock: 21,
    createdAt: '2026-07-18',
    badges: ['Handcrafted'],
    tones: ['champagne', 'navy', 'sand'],
  },
  {
    name: 'Eshal Zircon Set',
    category: 'sets',
    collection: 'Roshan',
    price: 3400,
    compareAtPrice: 4100,
    materials: ['Rhodium Plated', 'Zircon'],
    description:
      'A pear-drop pendant with matching drop earrings, pavé-set throughout — an evening set that photographs beautifully.',
    weight: '42 g (set)',
    dimensions: 'Pendant 2.4 cm · earring 3.2 cm drop',
    finish: 'Rhodium plating',
    stones: 'Pear and round zircon',
    rating: 4.8,
    reviewCount: 47,
    stock: 19,
    createdAt: '2026-08-01',
    isFeatured: true,
    tones: ['navy', 'ivory', 'champagne'],
  },
  {
    name: 'Rabia Temple Set',
    category: 'sets',
    collection: 'Swabi Heritage',
    price: 3950,
    materials: ['Gold Plated', 'Brass Alloy'],
    description:
      'A temple-work necklace with matching studs, cast from moulds the workshop has used for years.',
    weight: '112 g (set)',
    dimensions: 'Necklace 38 cm · stud 1.8 cm',
    finish: 'Antique gold temple-work plating',
    stones: 'None',
    rating: 4.9,
    reviewCount: 24,
    stock: 13,
    createdAt: '2026-07-12',
    badges: ['Handcrafted'],
    tones: ['champagne', 'sand', 'navy'],
  },
  {
    name: 'Dua Pearl Bangles',
    category: 'bangles',
    collection: 'Pearl Atelier',
    price: 1350,
    materials: ['Faux Pearl', 'Gold Plated'],
    description:
      'A pair of fine bangles threaded with small pearls between plated spacers — quiet, and endlessly wearable.',
    weight: '32 g (pair)',
    dimensions: '6.4 cm inner diameter',
    finish: 'Polished gold plating',
    stones: 'Shell pearls, 4 mm',
    rating: 4.7,
    reviewCount: 39,
    stock: 27,
    createdAt: '2026-08-05',
    tones: ['blush', 'ivory', 'champagne'],
  },
  {
    name: 'Zainab Bridal Rani Haar',
    category: 'bridal-jewellery',
    collection: 'Bridal Couture',
    price: 5600,
    materials: ['Kundan Style', 'Gold Plated', 'Faux Pearl'],
    description:
      'A long rani haar in three graduated tiers with a kundan-style pendant, worn over a choker for the full bridal silhouette.',
    weight: '236 g',
    dimensions: '52 cm · 7.4 cm pendant',
    finish: 'Antique gold plating with pearl drops',
    stones: 'Kundan-style stones and shell pearls',
    rating: 5,
    reviewCount: 17,
    stock: 9,
    createdAt: '2026-07-06',
    isFeatured: true,
    badges: ['Bridal'],
    tones: ['navy', 'blush', 'champagne'],
  },
  {
    name: 'Ifra Bridal Nath',
    category: 'bridal-jewellery',
    collection: 'Bridal Couture',
    price: 1450,
    materials: ['Kundan Style', 'Gold Plated', 'Faux Pearl'],
    description:
      'A clip-on nath with a pearl chain and adjustable hook — no piercing needed, and light enough to wear all evening.',
    weight: '14 g',
    dimensions: '4.6 cm ring · 22 cm chain',
    finish: 'Antique gold plating',
    stones: 'Kundan-style stones with pearl drops',
    rating: 4.7,
    reviewCount: 35,
    stock: 26,
    createdAt: '2026-08-19',
    isNew: true,
    badges: ['Clip-on'],
    tones: ['blush', 'champagne', 'ivory'],
  },
  {
    name: 'Alia Meenakari Pendant',
    category: 'necklaces',
    collection: 'Noor',
    price: 1250,
    materials: ['Meenakari', 'Gold Plated'],
    description:
      'A hand-painted meenakari pendant in deep enamel colours on a plated chain — a small piece of colour for plain kurtas.',
    weight: '16 g',
    dimensions: '44 cm chain · 3.2 cm pendant',
    finish: 'Enamel meenakari over gold plating',
    stones: 'Enamel work with AD accents',
    rating: 4.6,
    reviewCount: 52,
    stock: 36,
    createdAt: '2026-08-20',
    isNew: true,
    tones: ['navy', 'blush', 'champagne'],
  },
  {
    name: 'Sehr Meenakari Bangles',
    category: 'bangles',
    collection: 'Noor',
    price: 1550,
    materials: ['Meenakari', 'Gold Plated'],
    description:
      'Four hand-painted bangles in matched enamel colours, sold as a set and made to be worn with eastern wear.',
    weight: '58 g (set of four)',
    dimensions: '6.4 cm inner diameter · 8 mm width',
    finish: 'Enamel meenakari over plating',
    stones: 'Enamel work',
    rating: 4.6,
    reviewCount: 44,
    stock: 30,
    createdAt: '2026-08-07',
    isNew: true,
    tones: ['blush', 'navy', 'champagne'],
  },
  {
    name: 'Ayat Stacking Ring Set',
    category: 'rings',
    collection: 'Everyday Luxe',
    price: 780,
    materials: ['Gold Plated', 'AD Stones'],
    description:
      'Three slim rings — plain, twisted and stone-set — designed to be worn together on one finger or spread across the hand.',
    weight: '6 g (set of three)',
    dimensions: 'Bands 1.4–2 mm · sizes 6–9',
    finish: 'Polished gold plating',
    stones: 'Small AD accents',
    rating: 4.5,
    reviewCount: 58,
    stock: 48,
    createdAt: '2026-08-21',
    isNew: true,
    tones: ['sand', 'ivory', 'blush'],
  },
  {
    name: 'Noor Pearl Bracelet',
    category: 'bracelets',
    collection: 'Pearl Atelier',
    price: 720,
    materials: ['Faux Pearl', 'Gold Plated'],
    description:
      'A single strand of small shell pearls on an elastic core, so it slips on without a clasp.',
    weight: '9 g',
    dimensions: '17 cm stretch fit',
    finish: 'Plated spacers with shell pearls',
    stones: 'Shell pearls, 5 mm',
    rating: 4.5,
    reviewCount: 67,
    stock: 52,
    createdAt: '2026-08-03',
    tones: ['ivory', 'blush', 'sand'],
  },
]

export const products: Product[] = seeds.map(toProduct)

export const productsById = new Map(products.map((product) => [product.id, product]))

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug)
}

export function getProductsByIds(ids: string[]): Product[] {
  return ids.map((id) => productsById.get(id)).filter((p): p is Product => Boolean(p))
}

export const collections = Array.from(new Set(products.map((p) => p.collection))).sort()

export const materials = Array.from(new Set(products.flatMap((p) => p.materials))).sort()

export const priceBounds = {
  min: Math.min(...products.map((p) => p.price)),
  max: Math.max(...products.map((p) => p.price)),
}

const byNewest = (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt)

export const newArrivals = products.filter((p) => p.isNew).sort(byNewest)
export const featuredProducts = products.filter((p) => p.isFeatured)
export const bestSellers = products.filter((p) => p.isBestSeller)

export function relatedProducts(product: Product, limit = 4): Product[] {
  const sameCollection = products.filter(
    (p) => p.id !== product.id && p.collection === product.collection,
  )
  const sameCategory = products.filter(
    (p) => p.id !== product.id && p.category === product.category && !sameCollection.includes(p),
  )
  return [...sameCollection, ...sameCategory].slice(0, limit)
}
