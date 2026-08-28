import type { ReactNode } from 'react'
import { useScrollReveal } from '@/lib/useScrollReveal'

export function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'li'
}) {
  const ref = useScrollReveal<HTMLDivElement>(delay)
  const Component = Tag as 'div'
  return (
    <Component ref={ref} className={`reveal ${className}`}>
      {children}
    </Component>
  )
}
