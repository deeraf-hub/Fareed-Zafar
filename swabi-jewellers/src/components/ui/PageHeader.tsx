import type { ReactNode } from 'react'
import { Breadcrumbs, type Crumb } from './Breadcrumbs'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  crumbs?: Crumb[]
  children?: ReactNode
}

export function PageHeader({ eyebrow, title, description, crumbs, children }: PageHeaderProps) {
  return (
    <header className="border-b border-linen bg-cream/50">
      <div className="container-luxe py-10 lg:py-14">
        {crumbs && <Breadcrumbs items={crumbs} className="mb-6" />}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 font-display text-3xl leading-tight text-balance sm:text-4xl lg:text-[46px]">
          {title}
        </h1>
        {description && (
          <div className="mt-4 max-w-2xl text-sm leading-relaxed text-stoneish sm:text-[15px]">
            {description}
          </div>
        )}
        {children}
      </div>
    </header>
  )
}
