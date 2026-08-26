import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { siteConfig } from '@/config/site'

interface SeoProps {
  title: string
  description?: string
  /** JSON-LD structured data (Product, BreadcrumbList, Organization…). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
  noIndex?: boolean
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

/** Per-page document title, meta description, canonical URL and structured data. */
export function Seo({ title, description, jsonLd, noIndex }: SeoProps) {
  const { pathname } = useLocation()
  const fullTitle = title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`
  const metaDescription = description ?? siteConfig.description

  useEffect(() => {
    document.title = fullTitle
    setMeta('meta[name="description"]', 'name', 'description', metaDescription)
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle)
    setMeta('meta[property="og:description"]', 'property', 'og:description', metaDescription)
    setMeta('meta[property="og:url"]', 'property', 'og:url', `${siteConfig.url}${pathname}`)
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow')

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = `${siteConfig.url}${pathname}`
  }, [fullTitle, metaDescription, noIndex, pathname])

  useEffect(() => {
    if (!jsonLd) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)
    return () => {
      script.remove()
    }
  }, [jsonLd])

  return null
}
