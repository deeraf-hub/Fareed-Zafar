import { useEffect } from 'react'
import { siteConfig } from '@/config/site'

function setMetaDescription(content: string) {
  let tag = document.querySelector('meta[name="description"]')
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', 'description')
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/** Sets document title + meta description for SEO on route change. */
export function useSeo(title: string, description?: string) {
  useEffect(() => {
    document.title = title.includes(siteConfig.brandName) ? title : `${title} — ${siteConfig.brandName}`
    if (description) setMetaDescription(description)
  }, [title, description])
}
