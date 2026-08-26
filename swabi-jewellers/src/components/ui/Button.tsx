import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'outline' | 'ghost' | 'gold' | 'dark'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-navy-700 text-ivory border border-navy-700 hover:bg-navy-800 hover:border-navy-800 disabled:bg-navy-700/50',
  gold: 'bg-champagne-500 text-white border border-champagne-500 hover:bg-champagne-600 hover:border-champagne-600',
  outline:
    'bg-transparent text-navy-700 border border-navy-700/25 hover:border-navy-700 hover:bg-navy-700 hover:text-ivory',
  ghost: 'bg-transparent text-navy-700 border border-transparent hover:text-champagne-600',
  dark: 'bg-ivory text-navy-700 border border-ivory hover:bg-champagne-100 hover:border-champagne-100',
}

const SIZES: Record<Size, string> = {
  sm: 'px-5 py-2 text-[11px]',
  md: 'px-7 py-3 text-[11px]',
  lg: 'px-9 py-4 text-xs',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  className?: string
  children: ReactNode
}

function classes({ variant = 'primary', size = 'md', fullWidth, className = '' }: CommonProps) {
  return [
    'inline-flex items-center justify-center gap-2 uppercase tracking-wideish font-medium',
    'transition-all duration-500 ease-luxe disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export function Button({
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes({ variant, size, fullWidth, className, children })} {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  to,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: CommonProps & { to: string; onClick?: () => void }) {
  return (
    <Link to={to} className={classes({ variant, size, fullWidth, className, children })} {...props}>
      {children}
    </Link>
  )
}
