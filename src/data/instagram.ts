import type { PhotoKey } from '@/assets/photography/photos'

/** Demo Instagram gallery — swap for a real Graph API feed later. */
export const instagramPosts: { id: string; photo: PhotoKey; caption: string }[] = [
  { id: 'ig1', photo: 'model-closeup', caption: 'Statement necklace, styled for the season.' },
  { id: 'ig2', photo: 'model-hero', caption: 'Editorial campaign — Aura collection.' },
  { id: 'ig3', photo: 'model-bridal', caption: 'Bridal season is here.' },
  { id: 'ig4', photo: 'model-hand-ring', caption: 'Everyday rings, stacked just right.' },
  { id: 'ig5', photo: 'packaging-gift-box', caption: 'Gift-ready, always.' },
  { id: 'ig6', photo: 'lifestyle-silk-chain', caption: 'Behind the scenes at the studio.' },
]
