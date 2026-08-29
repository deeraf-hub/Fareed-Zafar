import { Link } from 'react-router-dom'

function Mark({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#122A44" />
      <path d="M32 10a22 22 0 0 1 8 42.3V54h-16v-1.7A22 22 0 0 1 32 10Z" fill="#1C3F63" />
      <g stroke="#F0F3F6" strokeWidth="3.4" strokeLinecap="round">
        <path d="M20 20 L44 44" />
        <path d="M44 20 L20 44" />
      </g>
      <circle cx="32" cy="32" r="6.5" fill="#F5820C" />
      <text
        x="32"
        y="35.5"
        fontFamily="Oswald, Arial, sans-serif"
        fontSize="6.5"
        fontWeight="700"
        fill="#122A44"
        textAnchor="middle"
      >
        HT
      </text>
    </svg>
  )
}

export default function Logo({ variant = 'default', className = '' }) {
  const isLight = variant === 'light'
  return (
    <Link to="/" className={`flex items-center gap-3 shrink-0 ${className}`} aria-label="Hand Tools Trading Corporation home">
      <Mark className="h-10 w-10 md:h-11 md:w-11" />
      <span className="leading-tight">
        <span
          className={`block font-heading font-bold tracking-wide text-[15px] md:text-[17px] uppercase ${
            isLight ? 'text-white' : 'text-navy-900'
          }`}
        >
          Hand Tools Trading
        </span>
        <span className={`block text-[11px] md:text-xs font-medium tracking-[0.2em] uppercase ${isLight ? 'text-steel-200' : 'text-accent-600'}`}>
          Corporation
        </span>
      </span>
    </Link>
  )
}
