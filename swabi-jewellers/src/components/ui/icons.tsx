import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
}

export const SearchIcon = (props: IconProps) => (
  <svg {...base} width="20" height="20" {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
)

export const UserIcon = (props: IconProps) => (
  <svg {...base} width="20" height="20" {...props}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.8 20c1.3-3.6 4-5.4 7.2-5.4s5.9 1.8 7.2 5.4" />
  </svg>
)

export const HeartIcon = ({ filled, ...props }: IconProps & { filled?: boolean }) => (
  <svg {...base} width="20" height="20" fill={filled ? 'currentColor' : 'none'} {...props}>
    <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20Z" />
  </svg>
)

export const BagIcon = (props: IconProps) => (
  <svg {...base} width="20" height="20" {...props}>
    <path d="M5.4 7.5h13.2l-1 12.1H6.4z" />
    <path d="M9 9.4V6.8a3 3 0 0 1 6 0v2.6" />
  </svg>
)

export const MenuIcon = (props: IconProps) => (
  <svg {...base} width="22" height="22" {...props}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...base} width="20" height="20" {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base} width="16" height="16" {...props}>
    <path d="m5 9 7 7 7-7" />
  </svg>
)

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="m15 4-7 8 7 8" />
  </svg>
)

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="m9 4 7 8-7 8" />
  </svg>
)

export const ArrowRightIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="M4 12h15M13.5 6.5 20 12l-6.5 5.5" />
  </svg>
)

export const StarIcon = ({ fillLevel = 1, ...props }: IconProps & { fillLevel?: number }) => {
  const clipId = `star-clip-${Math.round(fillLevel * 100)}`
  return (
    <svg {...base} width="14" height="14" strokeWidth={1.1} {...props}>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={24 * fillLevel} height="24" />
        </clipPath>
      </defs>
      <path
        d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
        opacity="0.95"
      />
      <path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
    </svg>
  )
}

export const MinusIcon = (props: IconProps) => (
  <svg {...base} width="16" height="16" {...props}>
    <path d="M5 12h14" />
  </svg>
)

export const PlusIcon = (props: IconProps) => (
  <svg {...base} width="16" height="16" {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const TrashIcon = (props: IconProps) => (
  <svg {...base} width="16" height="16" {...props}>
    <path d="M4.5 7h15M9.5 7V5.5h5V7M6.8 7l.8 12.5h8.8L17.2 7M10 10.5v6M14 10.5v6" />
  </svg>
)

export const CheckIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
)

export const FilterIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </svg>
)

export const ZoomIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M11 8.5v5M8.5 11h5m2.5 5 4.5 4.5" />
  </svg>
)

export const EyeIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="M2.8 12S6.4 5.8 12 5.8 21.2 12 21.2 12 17.6 18.2 12 18.2 2.8 12 2.8 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
)

export const PhoneIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="M6.2 3.8h3l1.4 3.6-2 1.4a11 11 0 0 0 5.6 5.6l1.4-2 3.6 1.4v3a1.8 1.8 0 0 1-2 1.8A15.6 15.6 0 0 1 4.4 5.8a1.8 1.8 0 0 1 1.8-2Z" />
  </svg>
)

export const MailIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <rect x="3.2" y="5.5" width="17.6" height="13" rx="1.4" />
    <path d="m3.6 6.5 8.4 6.4 8.4-6.4" />
  </svg>
)

export const PinIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="M12 21s6.4-6 6.4-10.4a6.4 6.4 0 1 0-12.8 0C5.6 15 12 21 12 21Z" />
    <circle cx="12" cy="10.4" r="2.4" />
  </svg>
)

export const InstagramIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <rect x="4" y="4" width="16" height="16" rx="4.4" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
  </svg>
)

export const FacebookIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="M14.6 8.4h2.2V5.6h-2.4c-2 0-3.4 1.4-3.4 3.6v1.6H8.8v2.8H11V20h2.9v-6.4h2.2l.5-2.8h-2.7V9.6c0-.8.3-1.2.7-1.2Z" />
  </svg>
)

export const TikTokIcon = (props: IconProps) => (
  <svg {...base} width="18" height="18" {...props}>
    <path d="M14.4 4v9.6a3.2 3.2 0 1 1-2.8-3.2" />
    <path d="M14.4 4c.5 2.2 1.9 3.4 4 3.6" />
  </svg>
)

export const CertificateIcon = (props: IconProps) => (
  <svg {...base} width="24" height="24" strokeWidth={1.1} {...props}>
    <circle cx="12" cy="9.5" r="5" />
    <path d="M9 13.6 8 21l4-2 4 2-1-7.4M12 7.2l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9.1 9.3l2-.3z" />
  </svg>
)

export const ShieldIcon = (props: IconProps) => (
  <svg {...base} width="24" height="24" strokeWidth={1.1} {...props}>
    <path d="M12 3.2 19 6v6c0 4-3 7.4-7 8.8-4-1.4-7-4.8-7-8.8V6z" />
    <path d="m9 12 2.2 2.2L15.4 10" />
  </svg>
)

export const GiftIcon = (props: IconProps) => (
  <svg {...base} width="24" height="24" strokeWidth={1.1} {...props}>
    <rect x="3.6" y="9.4" width="16.8" height="11" rx="1.2" />
    <path d="M3.6 13.4h16.8M12 9.4v11" />
    <path d="M12 9.4C10.6 6.6 8.8 5.2 7.6 5.8c-1.2.6-.6 2.6 4.4 3.6 5-1 5.6-3 4.4-3.6-1.2-.6-3 .8-4.4 3.6Z" />
  </svg>
)

export const TruckIcon = (props: IconProps) => (
  <svg {...base} width="24" height="24" strokeWidth={1.1} {...props}>
    <path d="M3.2 6.6h10.2v9.8H3.2zM13.4 10h3.8l3.6 3.4v3h-7.4z" />
    <circle cx="7.4" cy="18.2" r="1.8" />
    <circle cx="16.8" cy="18.2" r="1.8" />
  </svg>
)

export const SupportIcon = (props: IconProps) => (
  <svg {...base} width="24" height="24" strokeWidth={1.1} {...props}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M8.6 15.4v-4a3.4 3.4 0 0 1 6.8 0v4M5.6 12.6h3v3.4h-3zM15.4 12.6h3V16h-3z" />
  </svg>
)

export const ICON_MAP = {
  certificate: CertificateIcon,
  shield: ShieldIcon,
  gift: GiftIcon,
  truck: TruckIcon,
  support: SupportIcon,
} as const
