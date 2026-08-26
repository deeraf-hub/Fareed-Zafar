import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './icons'
import { Reveal } from './Reveal'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  align?: 'center' | 'left'
  link?: { label: string; to: string }
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  link,
  className = '',
}: SectionHeadingProps) {
  const centered = align === 'center'
  return (
    <Reveal
      className={`${centered ? 'text-center' : 'sm:flex sm:items-end sm:justify-between'} ${className}`}
    >
      <div className={centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-3 text-3xl leading-tight text-balance sm:text-4xl lg:text-[42px]">
          {title}
        </h2>
        {centered && <div className="rule-gold mt-5" />}
        {description && (
          <p className="mt-4 text-sm leading-relaxed text-stoneish sm:text-[15px]">{description}</p>
        )}
      </div>
      {link && (
        <Link
          to={link.to}
          className="link-underline mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-wideish text-navy-700 sm:mt-0"
        >
          {link.label}
          <ArrowRightIcon width={16} height={16} />
        </Link>
      )}
    </Reveal>
  )
}
