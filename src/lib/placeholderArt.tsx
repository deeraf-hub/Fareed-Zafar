import { useId } from 'react'

/**
 * Standalone fallback art system, kept for any image slot that doesn't
 * (yet) have a licensed photo in src/assets/photography — see Photo.tsx for
 * the primary, photo-backed renderer used across the live site. Every image
 * slot here is a hand-drawn, on-brand SVG placeholder rather than a
 * hot-linked stock photo — nothing to break, nothing to license, and every
 * scene below carries the descriptive prompt an art director or an
 * AI image generator would need to shoot/generate a real replacement.
 *
 * To go live with real photography: drop files into `src/assets/photography/`
 * and swap the `<PlaceholderArt scene="..." />` usage for a plain <img>,
 * using the prompt text below as the photography brief.
 */
export type PlaceholderScene =
  | 'necklace'
  | 'earrings'
  | 'ring'
  | 'bracelet'
  | 'bangles'
  | 'bridal'
  | 'set'
  | 'arrivals'
  | 'hero'
  | 'editorial'
  | 'hand'
  | 'minimal'
  | 'closeup'
  | 'packaging'
  | 'lifestyle'

export const PLACEHOLDER_PROMPTS: Record<PlaceholderScene, string> = {
  hero: 'Luxury fashion campaign photo of an elegant female model in three-quarter profile wearing a statement gold necklace, matching drop earrings and a delicate bracelet, soft studio lighting, ivory backdrop, premium editorial jewellery advertisement, natural skin texture, sophisticated composition.',
  editorial: 'Split-frame editorial portrait of a woman wearing a layered gold necklace and rings, soft window light, neutral champagne background, fashion-magazine styling, jewellery clearly in focus.',
  bridal: 'Pakistani bridal model wearing a traditional gold bridal set — layered necklace, jhumka earrings, matha patti and bangles — rich studio lighting, warm tones, luxurious and emotional bridal campaign photography.',
  minimal: 'Modern woman wearing minimal everyday gold jewellery — a thin chain necklace and small studs — natural daylight, clean neutral background, understated elegance.',
  hand: 'Close-up beauty photograph of a woman\'s hand resting elegantly, wearing a delicate gold ring and matching bracelet, soft shadow, ivory surface, macro jewellery detail photography.',
  closeup: 'Close-up beauty/fashion shot of a woman\'s neckline and ear showing a statement necklace and drop earring, soft studio lighting, shallow depth of field, luxury jewellery campaign.',
  necklace: 'Product photography of an elegant gold statement necklace with a pendant, displayed on a velvet bust, soft studio lighting, ivory background, high detail.',
  earrings: 'Product photography of a pair of elegant gold drop earrings, symmetrical composition, soft shadow, ivory background, high detail macro photography.',
  ring: 'Product photography of a gold ring with a faceted centre stone, macro detail shot, soft studio lighting, ivory background.',
  bracelet: 'Product photography of a delicate gold chain bracelet with a small charm, laid on ivory silk, soft natural light.',
  bangles: 'Product photography of a stack of gold bangles, elegantly arranged, soft studio lighting, ivory background.',
  set: 'Flat-lay product photography of a matching jewellery set — necklace, earrings and ring — arranged on ivory silk, soft overhead light, premium styling.',
  arrivals: 'Product photography of an opened luxury jewellery gift box with a new gold piece inside, soft ribbon, ivory background, celebratory but understated.',
  packaging: 'Product photography of Swabi Jewellers signature gift packaging — an elegant box tied with ribbon — soft studio lighting, ivory background.',
  lifestyle: 'Lifestyle flat-lay of jewellery pieces with a fresh flower and soft draped fabric, warm natural light, editorial styling.',
}

interface PlaceholderArtProps {
  scene: PlaceholderScene
  className?: string
  caption?: string
  showCaption?: boolean
  tone?: 'ivory' | 'beige' | 'charcoal'
}

const toneStops: Record<NonNullable<PlaceholderArtProps['tone']>, [string, string]> = {
  ivory: ['#F6F1E8', '#E8D3A4'],
  beige: ['#EFE6D3', '#D9CBAE'],
  charcoal: ['#3A322C', '#6B542D'],
}

function Chain({ d, stroke = '#AD8A4B' }: { d: string; stroke?: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeDasharray="0.6 7"
      opacity={0.85}
    />
  )
}

function Gem({ cx, cy, r = 8, fill = 'url(#gem)' }: { cx: number; cy: number; r?: number; fill?: string }) {
  return (
    <path
      d={`M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`}
      fill={fill}
      stroke="#8C6E3B"
      strokeWidth={0.75}
    />
  )
}

function BustSilhouette({ ornate = false }: { ornate?: boolean }) {
  return (
    <>
      <path
        d="M120 500 C118 380 150 320 165 300 C150 275 145 240 165 205 C180 178 210 165 235 165 C265 165 292 182 305 210 C320 240 315 278 300 302 C325 330 345 385 342 500 Z"
        fill="#241F1C"
        opacity={0.16}
      />
      {ornate && (
        <path
          d="M150 210 C185 195 260 195 300 212"
          fill="none"
          stroke="#8C6E3B"
          strokeWidth={2}
          strokeDasharray="0.5 5"
          opacity={0.7}
        />
      )}
    </>
  )
}

/** Renders the illustration content for a given scene onto a 400x500 canvas. */
function SceneArt({ scene }: { scene: PlaceholderScene }) {
  switch (scene) {
    case 'hero':
    case 'editorial':
      return (
        <>
          <BustSilhouette />
          <Chain d="M175 275 C200 320 240 320 265 275" />
          <Chain d="M195 300 C215 335 225 335 245 300" />
          <Gem cx={220} cy={330} r={10} />
          <path d="M158 250 L150 285" stroke="#AD8A4B" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
          <Gem cx={150} cy={292} r={5} />
          <path d="M282 250 L290 285" stroke="#AD8A4B" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
          <Gem cx={290} cy={292} r={5} />
        </>
      )
    case 'bridal':
      return (
        <>
          <BustSilhouette ornate />
          <Chain d="M160 265 C195 315 245 315 280 265" />
          <Chain d="M172 285 C205 325 235 325 268 285" />
          <Chain d="M188 300 C212 330 228 330 252 300" />
          <Gem cx={220} cy={332} r={13} />
          <path d="M220 165 L220 190" stroke="#AD8A4B" strokeWidth={2} strokeLinecap="round" />
          <Gem cx={220} cy={198} r={7} />
          <path d="M150 245 L140 292" stroke="#AD8A4B" strokeWidth={2.2} strokeLinecap="round" />
          <Gem cx={140} cy={300} r={6} />
          <path d="M290 245 L300 292" stroke="#AD8A4B" strokeWidth={2.2} strokeLinecap="round" />
          <Gem cx={300} cy={300} r={6} />
        </>
      )
    case 'minimal':
      return (
        <>
          <BustSilhouette />
          <Chain d="M195 270 C210 300 230 300 245 270" stroke="#C6A664" />
          <Gem cx={220} cy={302} r={5} fill="#C6A664" />
        </>
      )
    case 'closeup':
      return (
        <>
          <path d="M60 500 C60 380 110 300 200 300 C290 300 340 380 340 500 Z" fill="#241F1C" opacity={0.14} />
          <Chain d="M120 330 C160 390 240 390 280 330" />
          <Gem cx={200} cy={378} r={12} />
          <path d="M96 310 L86 355" stroke="#AD8A4B" strokeWidth={2.4} strokeLinecap="round" />
          <Gem cx={86} cy={363} r={7} />
        </>
      )
    case 'hand':
      return (
        <>
          <path
            d="M120 460 C110 400 115 330 130 270 C134 255 150 253 152 268 C156 300 158 330 158 330 C158 330 162 240 166 220 C168 206 186 206 186 222 C186 250 188 320 188 320 C188 320 192 210 196 195 C198 181 216 182 216 198 C217 225 216 320 216 320 C216 320 224 220 228 210 C232 197 249 200 248 216 C246 260 236 330 236 330 C260 320 288 330 296 355 C306 385 300 430 280 460 C255 495 190 500 160 495 C138 491 126 480 120 460 Z"
            fill="#241F1C"
            opacity={0.14}
          />
          <Gem cx={166} cy={222} r={9} />
          <Chain d="M258 356 C266 372 266 388 258 402" />
        </>
      )
    case 'necklace':
      return (
        <>
          <ellipse cx={200} cy={190} rx={130} ry={40} fill="#241F1C" opacity={0.08} />
          <Chain d="M90 190 C90 300 150 360 200 360 C250 360 310 300 310 190" />
          <Gem cx={200} cy={366} r={20} />
          <Gem cx={165} cy={352} r={9} />
          <Gem cx={235} cy={352} r={9} />
        </>
      )
    case 'earrings':
      return (
        <>
          <path d="M140 170 L140 220" stroke="#AD8A4B" strokeWidth={2.5} strokeLinecap="round" />
          <Gem cx={140} cy={232} r={14} />
          <Chain d="M132 246 C132 280 148 300 140 330" />
          <Gem cx={140} cy={342} r={9} />
          <path d="M260 170 L260 220" stroke="#AD8A4B" strokeWidth={2.5} strokeLinecap="round" />
          <Gem cx={260} cy={232} r={14} />
          <Chain d="M268 246 C268 280 252 300 260 330" />
          <Gem cx={260} cy={342} r={9} />
        </>
      )
    case 'ring':
      return (
        <>
          <circle cx={200} cy={310} r={70} fill="none" stroke="#AD8A4B" strokeWidth={10} opacity={0.85} />
          <Gem cx={200} cy={230} r={26} />
          <Gem cx={168} cy={245} r={10} />
          <Gem cx={232} cy={245} r={10} />
        </>
      )
    case 'bracelet':
      return (
        <>
          <path d="M90 300 C90 240 150 210 200 210 C250 210 310 240 310 300 C310 360 250 390 200 390 C150 390 90 360 90 300 Z" fill="none" />
          <Chain d="M100 300 C100 220 300 220 300 300 C300 380 100 380 100 300 Z" />
          <Gem cx={200} cy={210} r={14} />
        </>
      )
    case 'bangles':
      return (
        <>
          <circle cx={200} cy={300} r={95} fill="none" stroke="#AD8A4B" strokeWidth={9} opacity={0.9} />
          <circle cx={200} cy={300} r={72} fill="none" stroke="#C6A664" strokeWidth={9} opacity={0.9} />
          <circle cx={200} cy={300} r={49} fill="none" stroke="#8C6E3B" strokeWidth={9} opacity={0.9} />
        </>
      )
    case 'set':
      return (
        <>
          <Chain d="M110 150 C110 210 150 250 190 250 C230 250 270 210 270 150" />
          <Gem cx={190} cy={256} r={12} />
          <path d="M130 320 L130 355" stroke="#AD8A4B" strokeWidth={2.2} strokeLinecap="round" />
          <Gem cx={130} cy={365} r={9} />
          <path d="M250 320 L250 355" stroke="#AD8A4B" strokeWidth={2.2} strokeLinecap="round" />
          <Gem cx={250} cy={365} r={9} />
          <circle cx={190} cy={430} r={34} fill="none" stroke="#AD8A4B" strokeWidth={7} />
          <Gem cx={190} cy={396} r={11} />
        </>
      )
    case 'arrivals':
      return (
        <>
          <rect x={130} y={260} width={140} height={110} fill="none" stroke="#AD8A4B" strokeWidth={2.5} />
          <path d="M130 300 L270 300" stroke="#AD8A4B" strokeWidth={2.5} />
          <path d="M200 260 L200 370" stroke="#AD8A4B" strokeWidth={2.5} />
          <path d="M170 260 C170 235 230 235 230 260" fill="none" stroke="#C6A664" strokeWidth={3} />
          {[...Array(6)].map((_, i) => (
            <path
              key={i}
              d={`M${200 + Math.cos((i / 6) * Math.PI * 2) * 60} ${170 + Math.sin((i / 6) * Math.PI * 2) * 60} l4 4`}
              stroke="#C6A664"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </>
      )
    case 'packaging':
      return (
        <>
          <rect x={110} y={230} width={180} height={140} fill="#241F1C" opacity={0.1} />
          <rect x={110} y={230} width={180} height={140} fill="none" stroke="#AD8A4B" strokeWidth={2} />
          <path d="M110 270 L290 270" stroke="#AD8A4B" strokeWidth={2} />
          <path d="M200 230 L200 370" stroke="#C6A664" strokeWidth={6} />
          <path d="M170 230 C170 200 230 200 230 230" fill="none" stroke="#C6A664" strokeWidth={4} />
        </>
      )
    case 'lifestyle':
      return (
        <>
          <ellipse cx={200} cy={390} rx={150} ry={16} fill="#241F1C" opacity={0.08} />
          <rect x={140} y={310} width={120} height={80} fill="none" stroke="#AD8A4B" strokeWidth={2} />
          <Chain d="M150 300 C170 260 230 260 250 300" />
          <Gem cx={200} cy={266} r={10} />
          <path d="M300 330 C300 300 330 290 340 300 C350 310 335 330 320 340 C305 350 300 340 300 330 Z" fill="#EFE0DD" opacity={0.7} />
        </>
      )
    default:
      return null
  }
}

/**
 * On-brand SVG placeholder standing in for real photography.
 * See PLACEHOLDER_PROMPTS for the shoot/generation brief for each scene.
 */
export function PlaceholderArt({ scene, className = '', caption, showCaption, tone = 'ivory' }: PlaceholderArtProps) {
  const id = useId()
  const [from, to] = toneStops[tone]
  const dark = tone === 'charcoal'

  // Tailwind's position utilities share one CSS property, and its stylesheet
  // orders `.relative` after `.absolute` — so a hardcoded "relative" here
  // would always win over a caller's "absolute inset-0" full-bleed layering,
  // regardless of class order in the attribute. Only default to `relative`
  // when the caller hasn't already taken a position stance of their own.
  const callerSetsPosition = /(^|\s)(absolute|fixed|sticky|static|relative)(\s|$)/.test(className)
  const positionClass = callerSetsPosition ? '' : 'relative'

  return (
    <div className={`${positionClass} overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="img"
        aria-label={PLACEHOLDER_PROMPTS[scene]}
      >
        <defs>
          <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <radialGradient id="gem" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#FBF6EC" />
            <stop offset="55%" stopColor="#DCBE7C" />
            <stop offset="100%" stopColor="#AD8A4B" />
          </radialGradient>
          <pattern id={`${id}-noise`} width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="transparent" />
            <circle cx="1" cy="1" r="0.4" fill={dark ? '#FBF8F3' : '#241F1C'} opacity="0.035" />
          </pattern>
        </defs>
        <rect width="400" height="500" fill={`url(#${id}-bg)`} />
        <rect width="400" height="500" fill={`url(#${id}-noise)`} />
        <g>
          <SceneArt scene={scene} />
        </g>
      </svg>

      {showCaption && caption && (
        <div className="pointer-events-none absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
          <span className="bg-ivory/85 px-3 py-1.5 text-[11px] uppercase tracking-widest2 text-charcoal-soft backdrop-blur-sm">
            {caption}
          </span>
        </div>
      )}
    </div>
  )
}
