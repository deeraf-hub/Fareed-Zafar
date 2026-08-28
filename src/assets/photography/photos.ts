// Licensed, royalty-free product and lifestyle photography (Adobe Stock,
// free tier — see individual credit strings below). Each import is bundled
// and optimized by Vite; swap any entry for your own photography by
// replacing the file and updating its import here — nothing else changes.

import necklaceGoldChain from './501478593.jpg'
import necklacePearlEmerald from './294339598.jpg'
import necklaceSilverDiamond from './363267174.jpg'
import earringsGoldHoop from './682421911.jpg'
import earringsPearl from './142156751.jpg'
import earringsDiamondPink from './459155130.jpg'
import ringDiamond from './418133302.jpg'
import ringOpalGold from './213929936.jpg'
import ringGoldPair from './984408198.jpg'
import braceletGoldenPair from './405641292.jpg'
import braceletTennis from './201110440.jpg'
import braceletOnHand from './532137657.jpg'
import bangleGold from './387492437.jpg'
import bangleIndianDesign from './680079740.jpg'
import bangleDisplaySet from './509367091.jpg'
import bridalPearlSet from './680865913.jpg'
import bridalTempleEarrings from './696446410.jpg'
import bridalHeartNecklaceBox from './1144595466.jpg'
import setBraceletEarringsPink from './214685512.jpg'
import setEarringsPendant from './318622687.jpg'
import setJewelryCollage from './756030369.jpg'
import modelHero from './417125249.jpg'
import modelEditorial from './333970352.jpg'
import modelBridal from './808785690.jpg'
import modelCloseup from './684260217.jpg'
import modelHandRing from './573417753.jpg'
import modelMinimal from './782905251.jpg'
import packagingGiftBox from './145497177.jpg'
import lifestyleSilkChain from './571983700.jpg'

export const PHOTOS = {
  'necklace-gold-chain': { src: necklaceGoldChain, alt: 'Gold chain necklace product photography', credit: 'Adobe Stock' },
  'necklace-pearl-emerald': { src: necklacePearlEmerald, alt: 'Luxury pearl necklace on silk background', credit: 'Adobe Stock' },
  'necklace-silver-diamond': { src: necklaceSilverDiamond, alt: 'Diamond silver chain and pendant', credit: 'Adobe Stock' },
  'earrings-gold-hoop': { src: earringsGoldHoop, alt: 'Gold hoop earrings on white background', credit: 'Adobe Stock' },
  'earrings-pearl': { src: earringsPearl, alt: 'Classic pearl earrings', credit: 'Adobe Stock' },
  'earrings-diamond-pink': { src: earringsDiamondPink, alt: 'Gold diamond earrings on soft pink background', credit: 'Adobe Stock' },
  'ring-diamond': { src: ringDiamond, alt: 'Diamond ring macro product photography', credit: 'Adobe Stock' },
  'ring-opal-gold': { src: ringOpalGold, alt: 'Opal gemstone gold ring', credit: 'Adobe Stock' },
  'ring-gold-pair': { src: ringGoldPair, alt: 'Pair of gold rings on white background', credit: 'Adobe Stock' },
  'bracelet-golden-pair': { src: braceletGoldenPair, alt: 'Two modern gold bracelets', credit: 'Adobe Stock' },
  'bracelet-tennis': { src: braceletTennis, alt: 'Gold tennis bracelet', credit: 'Adobe Stock' },
  'bracelet-on-hand': { src: braceletOnHand, alt: 'Gold bracelet chain on hand, close-up', credit: 'Adobe Stock' },
  'bangle-gold': { src: bangleGold, alt: 'Gold bangle isolated on white background', credit: 'Adobe Stock' },
  'bangle-indian-design': { src: bangleIndianDesign, alt: 'Indian design gold bangle', credit: 'Adobe Stock' },
  'bangle-display-set': { src: bangleDisplaySet, alt: 'Set of gold bangles on display', credit: 'Adobe Stock' },
  'bridal-pearl-set': { src: bridalPearlSet, alt: 'Vintage pearl necklace set for a wedding', credit: 'Adobe Stock' },
  'bridal-temple-earrings': { src: bridalTempleEarrings, alt: 'Traditional gold temple jewellery earring set', credit: 'Adobe Stock' },
  'bridal-heart-necklace-box': { src: bridalHeartNecklaceBox, alt: 'Heart-shaped diamond necklace in a jewellery box', credit: 'Adobe Stock' },
  'set-bracelet-earrings-pink': { src: setBraceletEarringsPink, alt: 'Matching gold bracelet and earrings set', credit: 'Adobe Stock' },
  'set-earrings-pendant': { src: setEarringsPendant, alt: 'Pair of diamond earrings and matching pendant', credit: 'Adobe Stock' },
  'set-jewelry-collage': { src: setJewelryCollage, alt: 'Curated collection of matching jewellery pieces', credit: 'Adobe Stock' },
  'model-hero': { src: modelHero, alt: 'Elegant woman wearing a necklace, ring and earrings', credit: 'Adobe Stock' },
  'model-editorial': { src: modelEditorial, alt: 'Elegant woman wearing statement earrings, fashion portrait', credit: 'Adobe Stock' },
  'model-bridal': { src: modelBridal, alt: 'Bride wearing traditional heavy gold bridal jewellery', credit: 'Adobe Stock' },
  'model-closeup': { src: modelCloseup, alt: 'Close-up beauty shot wearing diamond earring and necklace', credit: 'Adobe Stock' },
  'model-hand-ring': { src: modelHandRing, alt: 'Close-up of a hand wearing a diamond ring', credit: 'Adobe Stock' },
  'model-minimal': { src: modelMinimal, alt: 'Woman wearing a minimal modern earring', credit: 'Adobe Stock' },
  'packaging-gift-box': { src: packagingGiftBox, alt: 'Gift box with ribbon and pearl jewellery', credit: 'Adobe Stock' },
  'lifestyle-silk-chain': { src: lifestyleSilkChain, alt: 'Gold chain jewellery styled on silk fabric', credit: 'Adobe Stock' },
} as const

export type PhotoKey = keyof typeof PHOTOS
