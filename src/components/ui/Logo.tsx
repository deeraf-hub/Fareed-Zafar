import { useId } from 'react'

/**
 * Recreated as a vector from the brand logo supplied in chat — a diamond
 * outline with a script "S" monogram and a sparkle above, paired with the
 * "SWABI / JEWELLERS" wordmark. No source image file was available to this
 * session (chat attachments aren't materialized to disk here), so this is a
 * faithful redraw rather than a trace. Swap `<LogoMark>`'s contents for an
 * <image> tag if the original artwork becomes available as a file.
 */

const GOLD_STOPS: [string, string, string] = ['#F3E7CC', '#CDA75B', '#8C6E3B']

function LogoGradientDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stopColor={GOLD_STOPS[0]} />
        <stop offset="55%" stopColor={GOLD_STOPS[1]} />
        <stop offset="100%" stopColor={GOLD_STOPS[2]} />
      </linearGradient>
    </defs>
  )
}

export function LogoMark({ className = '' }: { className?: string }) {
  const id = useId()
  const gradientId = `${id}-gold`

  return (
    <svg viewBox="0 0 100 108" className={className} role="img" aria-label="Swabi Jewellers monogram">
      <LogoGradientDefs id={gradientId} />
      {/* sparkle */}
      <path
        d="M50 2 L52.4 8.6 L59 11 L52.4 13.4 L50 20 L47.6 13.4 L41 11 L47.6 8.6 Z"
        fill={`url(#${gradientId})`}
      />
      {/* diamond outline */}
      <path
        d="M10 46 L32 22 L50 30 L68 22 L90 46 L50 100 Z"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* facets */}
      <path
        d="M10 46 L90 46 M32 22 L50 30 L68 22 M50 30 L50 100"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={1.4}
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* monogram */}
      <text
        x="50"
        y="70"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontStyle="italic"
        fontWeight={600}
        fontSize="40"
        fill={`url(#${gradientId})`}
      >
        S
      </text>
    </svg>
  )
}

interface LogoProps {
  className?: string
  orientation?: 'horizontal' | 'stacked'
  tone?: 'navy' | 'ivory'
  markClassName?: string
}

const toneColor: Record<NonNullable<LogoProps['tone']>, string> = {
  navy: '#1E2A47',
  ivory: '#FBF8F3',
}

export function Logo({ className = '', orientation = 'horizontal', tone = 'navy', markClassName = 'h-9 w-auto' }: LogoProps) {
  const color = toneColor[tone]
  const wordmark = (
    <span className="flex flex-col leading-none">
      <span style={{ color, fontFamily: "'Playfair Display', Georgia, serif" }} className="text-xl sm:text-2xl font-bold tracking-wide">
        SWABI
      </span>
      <span style={{ color }} className="mt-0.5 text-[9px] sm:text-[10px] font-body font-medium tracking-widest2">
        JEWELLERS
      </span>
    </span>
  )

  if (orientation === 'stacked') {
    return (
      <span className={`flex flex-col items-center gap-2 ${className}`}>
        <LogoMark className={markClassName} />
        {wordmark}
      </span>
    )
  }

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      {wordmark}
    </span>
  )
}
