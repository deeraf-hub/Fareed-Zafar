import { useId } from 'react'

interface LogoProps {
  variant?: 'inline' | 'stacked' | 'mark'
  /** Wordmark colour — navy on light grounds, ivory on dark ones. */
  tone?: 'navy' | 'ivory'
  className?: string
  markClassName?: string
}

/** The Swabi Jewellers mark: a champagne-gold brilliant with an ornate S at its centre. */
function Mark({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 118" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#E7D3AC" />
          <stop offset="0.45" stopColor="#C6A664" />
          <stop offset="1" stopColor="#8E6C2E" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${id}-gold)`} fill="none" strokeLinejoin="round">
        <path d="M12 42 L30 20 H90 L108 42 L60 108 Z" strokeWidth="3" />
        <path d="M12 42 H108" strokeWidth="1.6" opacity="0.85" />
        <path d="M30 20 L42 42 L60 108 M90 20 L78 42" strokeWidth="1.6" opacity="0.85" />
        <path d="M52 10 L60 2 L68 10 L60 20 Z" strokeWidth="1.8" />
        <path d="M52 10 H68 M60 2 V20" strokeWidth="0.9" opacity="0.8" />
      </g>
      <g fill={`url(#${id}-gold)`} opacity="0.9">
        <path d="M42 6 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6z" />
        <path d="M78 10 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2z" />
      </g>
      <text
        x="60"
        y="80"
        textAnchor="middle"
        fontFamily='"Cormorant Garamond", Georgia, serif'
        fontStyle="italic"
        fontWeight="500"
        fontSize="62"
        fill={`url(#${id}-gold)`}
      >
        S
      </text>
    </svg>
  )
}

export function Logo({ variant = 'inline', tone = 'navy', className = '', markClassName }: LogoProps) {
  const wordColour = tone === 'ivory' ? 'text-ivory' : 'text-navy-700'

  if (variant === 'mark') {
    return <Mark className={markClassName ?? className} />
  }

  if (variant === 'stacked') {
    return (
      <span className={`flex flex-col items-center ${className}`}>
        <Mark className={markClassName ?? 'h-14 w-14'} />
        <span className={`mt-3 font-display text-[26px] leading-none tracking-[0.16em] ${wordColour}`}>
          SWABI
        </span>
        <span className={`mt-1.5 text-[10px] tracking-luxe ${wordColour} opacity-80`}>JEWELLERS</span>
      </span>
    )
  }

  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Mark className={markClassName ?? 'h-9 w-9 shrink-0'} />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[20px] tracking-[0.16em] ${wordColour} sm:text-[22px]`}>
          SWABI
        </span>
        <span className={`mt-1 text-[8.5px] tracking-luxe ${wordColour} opacity-75 sm:text-[9px]`}>
          JEWELLERS
        </span>
      </span>
    </span>
  )
}
