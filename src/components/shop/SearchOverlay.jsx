import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { PRODUCTS } from '../../data/products.js'
import { getProductImage } from '../../data/images.js'
import { formatPKR } from '../../lib/format.js'

export default function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.shortDescription.toLowerCase().includes(q),
    ).slice(0, 6)
  }, [query])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-stretch bg-navy-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto mt-16 w-full max-w-2xl px-4">
        <div className="rounded-lg bg-white shadow-2xl">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 border-b border-steel-100 px-4 py-3">
            <Search size={20} className="text-steel-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hammers, drills, wrenches, screws..."
              className="flex-1 text-base text-navy-900 outline-none placeholder:text-steel-400"
            />
            <button type="button" onClick={onClose} aria-label="Close search" className="text-steel-400 hover:text-navy-900">
              <X size={22} />
            </button>
          </form>

          <div className="max-h-[60vh] overflow-y-auto thin-scrollbar">
            {query.trim() && results.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-steel-500">
                No products found for &ldquo;{query}&rdquo;.
              </p>
            )}
            {results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  navigate(`/product/${product.id}`)
                  onClose()
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-steel-50"
              >
                <img
                  src={getProductImage(product, 100)}
                  alt={product.name}
                  className="h-12 w-12 rounded object-cover"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-navy-900">{product.name}</span>
                  <span className="block text-xs text-steel-500">{formatPKR(product.price)}</span>
                </span>
              </button>
            ))}
            {results.length > 0 && (
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full border-t border-steel-100 px-4 py-3 text-center text-sm font-semibold text-accent-600 hover:bg-steel-50"
              >
                See all results for &ldquo;{query}&rdquo;
              </button>
            )}
          </div>
        </div>
      </div>
      <button className="flex-1" aria-label="Close search overlay" onClick={onClose} />
    </div>
  )
}
