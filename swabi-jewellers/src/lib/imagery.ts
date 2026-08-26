import type { ImageAsset, MotifKind } from '@/types'

/**
 * Branded image placeholders.
 *
 * The demo build ships without photography, so every `ImageAsset` with an empty
 * `src` is rendered as a hand-drawn SVG in the Swabi Jewellers palette — ivory
 * grounds, champagne line art, editorial framing — instead of a grey box.
 *
 * To go live, set `src` on the asset (a CDN URL or an imported file) and the real
 * photograph is used verbatim. Nothing else in the UI changes.
 */

type Tone = NonNullable<ImageAsset['tone']>

interface Palette {
  from: string
  to: string
  glow: string
  figure: string
  figureDeep: string
  gold: string
  goldSoft: string
  goldDeep: string
}

const PALETTES: Record<Tone, Palette> = {
  ivory: {
    from: '#FDFBF7',
    to: '#EFE5D4',
    glow: '#FFFFFF',
    figure: '#E6D8C3',
    figureDeep: '#D8C4A9',
    gold: '#C6A664',
    goldSoft: '#E3CFA4',
    goldDeep: '#9C7734',
  },
  champagne: {
    from: '#F9F1E2',
    to: '#E6D2AE',
    glow: '#FFF9EC',
    figure: '#DEC9A2',
    figureDeep: '#CDB283',
    gold: '#A6813C',
    goldSoft: '#D9BC83',
    goldDeep: '#7C5D26',
  },
  navy: {
    from: '#1A3358',
    to: '#0A1727',
    glow: '#27456F',
    figure: '#1F3D68',
    figureDeep: '#16304F',
    gold: '#D9BC83',
    goldSoft: '#F0DCB4',
    goldDeep: '#A6813C',
  },
  blush: {
    from: '#FBF2ED',
    to: '#EAD6CB',
    glow: '#FFF8F4',
    figure: '#E3CABC',
    figureDeep: '#D2B3A2',
    gold: '#C09055',
    goldSoft: '#E0C093',
    goldDeep: '#95682F',
  },
  sand: {
    from: '#F5EEE0',
    to: '#E0D0B4',
    glow: '#FFFAF0',
    figure: '#D9C7A6',
    figureDeep: '#C6B08A',
    gold: '#B08E4C',
    goldSoft: '#DDC59A',
    goldDeep: '#856032',
  },
}

const GOLD_LINE = 'url(#gold)'

function motifMarkup(motif: MotifKind): string {
  const necklace = `
    <path d="M30 20 C30 48 38 60 50 60 C62 60 70 48 70 20" fill="none" stroke="${GOLD_LINE}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M34 21 C34 45 40 55 50 55 C60 55 66 45 66 21" fill="none" stroke="${GOLD_LINE}" stroke-width="0.7" opacity="0.7"/>
    <path d="M50 60 l5 6 -5 9 -5 -9 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="50" cy="70" r="1.4" fill="${GOLD_LINE}" opacity="0.9"/>
    <circle cx="41" cy="52" r="1.1" fill="${GOLD_LINE}"/>
    <circle cx="59" cy="52" r="1.1" fill="${GOLD_LINE}"/>`

  const earrings = `
    <g>
      <circle cx="36" cy="26" r="3.2" fill="none" stroke="${GOLD_LINE}" stroke-width="1.3"/>
      <path d="M36 29 C31 40 33 52 36 60 C39 52 41 40 36 29 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1.2"/>
      <circle cx="36" cy="47" r="1.6" fill="${GOLD_LINE}" opacity="0.85"/>
    </g>
    <g>
      <circle cx="64" cy="26" r="3.2" fill="none" stroke="${GOLD_LINE}" stroke-width="1.3"/>
      <path d="M64 29 C59 40 61 52 64 60 C67 52 69 40 64 29 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1.2"/>
      <circle cx="64" cy="47" r="1.6" fill="${GOLD_LINE}" opacity="0.85"/>
    </g>`

  const ring = `
    <ellipse cx="50" cy="62" rx="20" ry="21" fill="none" stroke="${GOLD_LINE}" stroke-width="2"/>
    <ellipse cx="50" cy="62" rx="15" ry="16" fill="none" stroke="${GOLD_LINE}" stroke-width="0.7" opacity="0.6"/>
    <path d="M42 36 L50 26 L58 36 L50 47 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M42 36 H58 M50 26 V47 M44 30 L46 36 M56 30 L54 36" fill="none" stroke="${GOLD_LINE}" stroke-width="0.6" opacity="0.75"/>`

  const bracelet = `
    <ellipse cx="50" cy="50" rx="34" ry="19" fill="none" stroke="${GOLD_LINE}" stroke-width="1.6"/>
    <ellipse cx="50" cy="50" rx="28" ry="14" fill="none" stroke="${GOLD_LINE}" stroke-width="0.6" opacity="0.55"/>
    <circle cx="16" cy="50" r="2.2" fill="none" stroke="${GOLD_LINE}" stroke-width="1"/>
    <circle cx="84" cy="50" r="2.2" fill="none" stroke="${GOLD_LINE}" stroke-width="1"/>
    <circle cx="50" cy="69" r="2.6" fill="none" stroke="${GOLD_LINE}" stroke-width="1.1"/>
    <circle cx="34" cy="66" r="1.4" fill="${GOLD_LINE}" opacity="0.8"/>
    <circle cx="66" cy="66" r="1.4" fill="${GOLD_LINE}" opacity="0.8"/>`

  const bangle = `
    <circle cx="50" cy="50" r="31" fill="none" stroke="${GOLD_LINE}" stroke-width="2.2"/>
    <circle cx="50" cy="50" r="25" fill="none" stroke="${GOLD_LINE}" stroke-width="0.8" opacity="0.6"/>
    <circle cx="50" cy="50" r="35" fill="none" stroke="${GOLD_LINE}" stroke-width="0.5" opacity="0.35"/>
    <g opacity="0.85">
      <path d="M50 16 v6 M50 78 v6 M16 50 h6 M78 50 h6" stroke="${GOLD_LINE}" stroke-width="0.9" stroke-linecap="round"/>
      <path d="M26 26 l4 4 M74 26 l-4 4 M26 74 l4 -4 M74 74 l-4 -4" stroke="${GOLD_LINE}" stroke-width="0.9" stroke-linecap="round"/>
    </g>`

  const set = `
    <path d="M32 22 C32 46 39 57 50 57 C61 57 68 46 68 22" fill="none" stroke="${GOLD_LINE}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M50 57 l4.5 5.5 -4.5 8 -4.5 -8 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1.1" stroke-linejoin="round"/>
    <g opacity="0.95">
      <circle cx="19" cy="66" r="2.4" fill="none" stroke="${GOLD_LINE}" stroke-width="1"/>
      <path d="M19 68.5 C16 74 17 80 19 84 C21 80 22 74 19 68.5 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1"/>
      <circle cx="81" cy="66" r="2.4" fill="none" stroke="${GOLD_LINE}" stroke-width="1"/>
      <path d="M81 68.5 C78 74 79 80 81 84 C83 80 84 74 81 68.5 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1"/>
    </g>`

  const pendant = `
    <path d="M28 20 L50 54 L72 20" fill="none" stroke="${GOLD_LINE}" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M40 54 L50 42 L60 54 L50 74 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M40 54 H60 M50 42 V74 M44 47 L46 54 M56 47 L54 54" stroke="${GOLD_LINE}" stroke-width="0.6" opacity="0.7"/>`

  const handShot = `
    <path d="M18 88 C24 66 34 58 48 56 C56 55 64 52 70 46" fill="none" stroke="${GOLD_LINE}" stroke-width="0.9" opacity="0.55"/>
    <ellipse cx="34" cy="70" rx="13" ry="7.5" fill="none" stroke="${GOLD_LINE}" stroke-width="1.5" transform="rotate(-28 34 70)"/>
    <ellipse cx="62" cy="50" rx="8" ry="5" fill="none" stroke="${GOLD_LINE}" stroke-width="1.4" transform="rotate(-28 62 50)"/>
    <path d="M60 42 L65 36 L70 42 L65 49 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="46" cy="60" r="1.3" fill="${GOLD_LINE}"/>`

  const packaging = `
    <rect x="24" y="42" width="52" height="34" rx="2" fill="none" stroke="${GOLD_LINE}" stroke-width="1.5"/>
    <path d="M24 54 H76" stroke="${GOLD_LINE}" stroke-width="0.9" opacity="0.7"/>
    <path d="M50 42 V76" stroke="${GOLD_LINE}" stroke-width="0.9" opacity="0.7"/>
    <path d="M50 42 C42 34 34 32 34 26 C34 21 42 22 50 42 C58 22 66 21 66 26 C66 32 58 34 50 42 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1.2"/>`

  const lifestyle = `
    <path d="M24 40 L34 26 H66 L76 40 L50 78 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M24 40 H76 M34 26 L41 40 L50 78 M66 26 L59 40" fill="none" stroke="${GOLD_LINE}" stroke-width="0.7" opacity="0.7"/>`

  switch (motif) {
    case 'necklace':
      return necklace
    case 'earrings':
      return earrings
    case 'ring':
      return ring
    case 'bracelet':
      return bracelet
    case 'bangle':
      return bangle
    case 'set':
      return set
    case 'pendant':
      return pendant
    case 'hand-shot':
      return handShot
    case 'packaging':
      return packaging
    default:
      return lifestyle
  }
}

/** Editorial figure studies used for the model-led sections of the site. */
function figureMarkup(motif: MotifKind, p: Palette): string {
  const bridal = motif === 'bridal-model'
  const closeUp = motif === 'model-closeup'

  const hair = `
    <path d="M32 40 C32 19 68 19 68 40 C68 45.5 67.4 49.5 66.6 52.5 C66.6 38.5 60.5 32.5 50 32.5 C39.5 32.5 33.4 38.5 33.4 52.5 C32.6 49.5 32 45.5 32 40 Z" fill="${p.figureDeep}"/>
    <path d="M33.6 46 C29 60 30 72 33 82" fill="none" stroke="${p.figureDeep}" stroke-width="5.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M66.4 46 C71 60 70 72 67 82" fill="none" stroke="${p.figureDeep}" stroke-width="5.5" stroke-linecap="round" opacity="0.5"/>`

  const bridalHeadpiece = bridal
    ? `<path d="M35 30.5 C40 25.5 60 25.5 65 30.5" fill="none" stroke="${GOLD_LINE}" stroke-width="0.9"/>
       <path d="M50 28 l2.6 3.4 -2.6 4.4 -2.6 -4.4 z" fill="none" stroke="${GOLD_LINE}" stroke-width="0.8"/>
       <path d="M50 22 v6" fill="none" stroke="${GOLD_LINE}" stroke-width="0.7" opacity="0.8"/>`
    : ''

  const necklace = bridal
    ? `<path d="M38 78 C41.5 87 58.5 87 62 78" fill="none" stroke="${GOLD_LINE}" stroke-width="1.4"/>
       <path d="M35.5 80 C40 92 60 92 64.5 80" fill="none" stroke="${GOLD_LINE}" stroke-width="1.2" opacity="0.9"/>
       <path d="M33 82.5 C38.5 97 61.5 97 67 82.5" fill="none" stroke="${GOLD_LINE}" stroke-width="1" opacity="0.75"/>
       <path d="M50 95 l3 4 -3 6 -3 -6 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1" stroke-linejoin="round"/>`
    : `<path d="M38.5 78 C42 88.5 58 88.5 61.5 78" fill="none" stroke="${GOLD_LINE}" stroke-width="1.3"/>
       <path d="M50 85.5 l2.8 3.8 -2.8 5.6 -2.8 -5.6 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1" stroke-linejoin="round"/>`

  const earrings = bridal
    ? `<path d="M36.4 47.5 c-2 4 -1.6 8 0 11 c1.6 -3 2 -7 0 -11 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1"/>
       <path d="M63.6 47.5 c-2 4 -1.6 8 0 11 c1.6 -3 2 -7 0 -11 z" fill="none" stroke="${GOLD_LINE}" stroke-width="1"/>
       <circle cx="36.4" cy="46" r="1.1" fill="none" stroke="${GOLD_LINE}" stroke-width="0.8"/>
       <circle cx="63.6" cy="46" r="1.1" fill="none" stroke="${GOLD_LINE}" stroke-width="0.8"/>`
    : `<path d="M36.6 47 c-1.5 3.4 -1.2 6.6 0 9 c1.2 -2.4 1.5 -5.6 0 -9 z" fill="none" stroke="${GOLD_LINE}" stroke-width="0.9"/>
       <path d="M63.4 47 c-1.5 3.4 -1.2 6.6 0 9 c1.2 -2.4 1.5 -5.6 0 -9 z" fill="none" stroke="${GOLD_LINE}" stroke-width="0.9"/>`

  // The close-up crop pushes the figure larger and higher in the frame.
  const transform = closeUp ? 'translate(-25 -18) scale(1.5)' : ''

  return `
    <g ${transform ? `transform="${transform}"` : ''}>
      <path d="M2 110 C7 87 24 74.5 50 74.5 C76 74.5 93 87 98 110 Z" fill="${p.figure}"/>
      <path d="M43.2 55 h13.6 v20 c-4 3 -9.6 3 -13.6 0 z" fill="${p.figureDeep}" opacity="0.75"/>
      <ellipse cx="50" cy="39" rx="14.5" ry="18" fill="${p.figure}"/>
      ${hair}
      ${bridalHeadpiece}
      ${earrings}
      ${necklace}
    </g>`
}

const FIGURE_MOTIFS: MotifKind[] = [
  'model-portrait',
  'model-closeup',
  'bridal-model',
  'everyday-model',
]

const cache = new Map<string, string>()

export interface PlaceholderOptions {
  motif: MotifKind
  tone?: Tone
  width?: number
  height?: number
}

export function buildPlaceholder({
  motif,
  tone = 'ivory',
  width = 900,
  height = 1200,
}: PlaceholderOptions): string {
  const key = `${motif}|${tone}|${width}x${height}`
  const cached = cache.get(key)
  if (cached) return cached

  const p = PALETTES[tone]
  const isFigure = FIGURE_MOTIFS.includes(motif)
  const box = Math.min(width, height) * (isFigure ? 1 : 0.58)
  const x = (width - box) / 2
  const y = isFigure ? height - box : (height - box) / 2

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${p.from}"/>
      <stop offset="1" stop-color="${p.to}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.32" r="0.72">
      <stop offset="0" stop-color="${p.glow}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${p.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.goldSoft}"/>
      <stop offset="0.5" stop-color="${p.gold}"/>
      <stop offset="1" stop-color="${p.goldDeep}"/>
    </linearGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <g opacity="0.9">
    <circle cx="${width * 0.5}" cy="${height * 0.34}" r="${Math.min(width, height) * 0.42}" fill="none" stroke="url(#gold)" stroke-width="0.8" opacity="0.28"/>
    <circle cx="${width * 0.5}" cy="${height * 0.34}" r="${Math.min(width, height) * 0.5}" fill="none" stroke="url(#gold)" stroke-width="0.5" opacity="0.16"/>
  </g>
  <svg x="${x}" y="${y}" width="${box}" height="${box}" viewBox="0 0 100 ${isFigure ? 110 : 100}" preserveAspectRatio="xMidYMax meet">
    ${isFigure ? figureMarkup(motif, p) : motifMarkup(motif)}
  </svg>
  <rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.05"/>
</svg>`

  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`
  cache.set(key, uri)
  return uri
}

/** Resolve an asset to a usable `src` — real photography when present, placeholder otherwise. */
export function resolveImage(
  image: ImageAsset | undefined,
  size?: { width?: number; height?: number },
): string {
  if (!image) return buildPlaceholder({ motif: 'lifestyle', ...size })
  if (image.src) return image.src
  return buildPlaceholder({ motif: image.motif, tone: image.tone, ...size })
}
