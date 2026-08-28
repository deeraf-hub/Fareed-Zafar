import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: 'center' | 'left'
  action?: ReactNode
}) {
  const alignClasses = align === 'center' ? 'text-center items-center mx-auto' : 'text-left items-start'

  return (
    <Reveal className={`flex flex-col gap-3 ${alignClasses} max-w-2xl`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight text-charcoal">{title}</h2>
      {description && <p className="text-charcoal-muted text-base leading-relaxed">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Reveal>
  )
}
