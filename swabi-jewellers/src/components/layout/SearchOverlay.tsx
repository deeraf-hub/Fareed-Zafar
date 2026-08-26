import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchAll } from '@/lib/search'
import { SmartImage } from '@/components/ui/SmartImage'
import { formatPrice } from '@/lib/format'
import { CloseIcon, SearchIcon } from '@/components/ui/icons'
import { shoppableCategories } from '@/data/categories'

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

const POPULAR = ['Gold', 'Pearl', 'Bridal', 'Diamond ring', 'Jhumka']

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const suggestions = useMemo(() => searchAll(query), [query])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  if (!open) return null

  const submit = (value: string) => {
    const term = value.trim()
    if (!term) return
    onClose()
    navigate(`/shop?q=${encodeURIComponent(term)}`)
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 animate-fade-in bg-navy-900/40" onClick={onClose} aria-hidden="true" />
      <div className="relative animate-slide-down bg-ivory shadow-lift">
        <div className="container-luxe py-6 sm:py-10">
          <div className="flex items-center justify-between gap-4">
            <form
              className="flex flex-1 items-center gap-3 border-b border-linen pb-3"
              onSubmit={(event) => {
                event.preventDefault()
                submit(query)
              }}
              role="search"
            >
              <SearchIcon className="text-champagne-600" width={20} height={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for necklaces, pearls, bridal sets…"
                aria-label="Search products"
                className="w-full bg-transparent font-display text-xl outline-none placeholder:text-stoneish/70 sm:text-2xl"
              />
            </form>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center text-navy-700 transition-colors hover:text-champagne-600"
              aria-label="Close search"
            >
              <CloseIcon />
            </button>
          </div>

          {query.trim().length < 2 ? (
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="eyebrow">Popular searches</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {POPULAR.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => setQuery(term)}
                        className="border border-linen px-4 py-2 text-xs text-navy-700 transition-colors hover:border-champagne-400"
                      >
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Browse categories</p>
                <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {shoppableCategories.map((category) => (
                    <li key={category.slug}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          navigate(`/shop/${category.slug}`)
                        }}
                        className="link-underline text-navy-700"
                      >
                        {category.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-6 max-h-[55vh] overflow-y-auto">
              {suggestions.length === 0 ? (
                <p className="py-8 text-sm text-stoneish">
                  No matches for “{query}”. Try “gold”, “pearl” or “bridal”.
                </p>
              ) : (
                <ul className="divide-y divide-linen/70">
                  {suggestions.map((suggestion) => (
                    <li key={`${suggestion.type}-${suggestion.label}`}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          navigate(suggestion.to)
                        }}
                        className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-cream/60"
                      >
                        {suggestion.product ? (
                          <SmartImage
                            image={suggestion.product.images[0]}
                            ratio="aspect-square"
                            className="w-14 shrink-0"
                            width={160}
                            height={160}
                            sizes="56px"
                          />
                        ) : (
                          <span className="grid h-14 w-14 shrink-0 place-items-center bg-cream text-champagne-600">
                            <SearchIcon width={16} height={16} />
                          </span>
                        )}
                        <span className="flex-1">
                          <span className="block text-sm text-navy-700">{suggestion.label}</span>
                          <span className="block text-xs text-stoneish">{suggestion.sublabel}</span>
                        </span>
                        {suggestion.product && (
                          <span className="text-sm text-navy-700">
                            {formatPrice(suggestion.product.price)}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => submit(query)}
                className="link-underline mt-4 text-[11px] uppercase tracking-wideish text-navy-700"
              >
                See all results for “{query}”
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
