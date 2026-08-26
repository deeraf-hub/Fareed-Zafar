import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

/** Full class names — Tailwind only generates classes it can see written out in full. */
const ANIMATIONS = {
  'fade-up': 'animate-fade-up',
  'fade-in': 'animate-fade-in',
  'image-reveal': 'animate-image-reveal',
} as const

interface RevealProps {
  children: ReactNode
  /** Stagger in milliseconds, so a row of cards arrives one after another. */
  delay?: number
  className?: string
  as?: ElementType
  animation?: keyof typeof ANIMATIONS
}

/**
 * Scroll-triggered entrance animation. Uses IntersectionObserver once per element
 * and then disconnects, so long pages stay cheap.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
  animation = 'fade-up',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`${visible ? ANIMATIONS[animation] : 'opacity-0'} ${className}`}
      style={visible && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
