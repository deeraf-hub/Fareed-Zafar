import { useEffect } from 'react';
import { siteConfig } from '../config/site';

interface SeoOptions {
  title: string;
  description: string;
  /** JSON-LD structured data injected for the lifetime of the page. */
  jsonLd?: Record<string, unknown>;
  /** Set to true on admin screens so they are not indexed. */
  noindex?: boolean;
}

const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

/** Sets document title, meta description, canonical URL, Open Graph tags and JSON-LD. */
export const useSeo = ({ title, description, jsonLd, noindex }: SeoOptions): void => {
  useEffect(() => {
    const fullTitle = title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`;
    document.title = fullTitle;

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + window.location.pathname;

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      if (script) document.head.removeChild(script);
    };
  }, [title, description, jsonLd, noindex]);
};
