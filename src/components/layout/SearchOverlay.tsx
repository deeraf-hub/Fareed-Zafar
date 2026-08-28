import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { products } from '@/data/products'
import { categories } from '@/data/categories'
import { Photo } from '@/components/ui/Photo'
import { Price } from '@/components/ui/Price'
import { CloseIcon, SearchIcon } from '@/components/ui/Icons'

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      document.body.style.overflow = ''
      setQuery('')
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const q = query.trim().toLowerCase()

  const matchedProducts = useMemo(() => {
    if (!q) return []
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.includes(q) ||
          p.material.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 6)
  }, [q])

  const matchedCategories = useMemo(() => {
    if (!q) return []
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q)).slice(0, 4)
  }, [q])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!q) return
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] animate-fadeIn">
      <button aria-label="Close search" className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto mt-0 max-h-screen w-full max-w-3xl overflow-y-auto bg-ivory p-6 shadow-lift sm:mt-20 sm:p-10">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Search Swabi Jewellers</span>
          <button type="button" onClick={onClose} aria-label="Close" className="text-charcoal">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3 border-b border-charcoal/30 pb-3">
          <SearchIcon className="text-charcoal-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for necklaces, gold, bridal sets…"
            className="w-full bg-transparent text-lg text-charcoal placeholder:text-charcoal-muted focus:outline-none"
          />
        </form>

        {q && matchedProducts.length === 0 && matchedCategories.length === 0 && (
          <p className="mt-8 text-sm text-charcoal-muted">No results for &ldquo;{query}&rdquo;. Try &ldquo;gold&rdquo;, &ldquo;bridal&rdquo; or &ldquo;necklace&rdquo;.</p>
        )}

        {matchedCategories.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow mb-2">Collections</p>
            <div className="flex flex-wrap gap-2">
              {matchedCategories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/shop/${c.slug}`}
                  onClick={onClose}
                  className="border border-beige-dark px-3 py-1.5 text-xs text-charcoal hover:border-champagne-600"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchedProducts.length > 0 && (
          <div className="mt-6 flex flex-col divide-y divide-beige">
            {matchedProducts.map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                onClick={onClose}
                className="flex items-center gap-4 py-3 transition-colors hover:bg-cream/60"
              >
                <div className="h-16 w-14 flex-none overflow-hidden">
                  <Photo photoKey={p.images[0]} className="h-full w-full" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-charcoal">{p.name}</p>
                  <p className="text-xs capitalize text-charcoal-muted">{p.category.replace('-', ' ')}</p>
                </div>
                <Price price={p.price} compareAtPrice={p.compareAtPrice} size="sm" />
              </Link>
            ))}
          </div>
        )}

        {!q && (
          <div className="mt-8">
            <p className="eyebrow mb-3">Popular Searches</p>
            <div className="flex flex-wrap gap-2">
              {['Gold', 'Bridal', 'Necklace', 'Earrings', 'Pearl', 'New Arrivals'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="border border-beige-dark px-3 py-1.5 text-xs text-charcoal hover:border-champagne-600"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
