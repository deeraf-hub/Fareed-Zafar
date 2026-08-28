import { useEffect, useRef } from 'react'

/**
 * Adds the `.is-visible` class (see `.reveal` in index.css) the first time
 * the element scrolls into view. Cheap, dependency-free scroll animation.
 */
export function useScrollReveal<T extends HTMLElement>(delayMs = 0) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return
    }

    el.style.setProperty('--reveal-delay', `${delayMs}ms`)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('is-visible')
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delayMs])

  return ref
}
