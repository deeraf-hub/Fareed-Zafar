import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchSuggestions } from '../../lib/catalog';
import { formatPKR } from '../../lib/format';
import { useCatalog } from '../../store/CatalogContext';
import { ProductImage } from '../product/ProductImage';

interface SearchBarProps {
  placeholder?: string;
  size?: 'sm' | 'lg';
  autoFocus?: boolean;
  onSubmitted?: () => void;
  initialValue?: string;
}

/** Search box with live product suggestions and keyboard navigation. */
export const SearchBar = ({
  placeholder = 'Search part, bike model or SKU…',
  size = 'sm',
  autoFocus = false,
  onSubmitted,
  initialValue = '',
}: SearchBarProps) => {
  const { products } = useCatalog();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => searchSuggestions(products, query), [products, query]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const goToSearch = (value: string) => {
    setOpen(false);
    onSubmitted?.();
    navigate(value.trim() ? `/shop?q=${encodeURIComponent(value.trim())}` : '/shop');
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const product = suggestions[activeIndex];
      setOpen(false);
      onSubmitted?.();
      navigate(`/shop/${product.slug}`);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          goToSearch(query);
        }}
      >
        <label htmlFor={`search-${size}`} className="sr-only">
          Search products
        </label>
        <Search
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 ${
            size === 'lg' ? 'size-5' : 'size-4'
          }`}
          aria-hidden="true"
        />
        <input
          id={`search-${size}`}
          type="search"
          className={`field pl-10 pr-10 ${size === 'lg' ? 'h-14 text-base' : 'h-11'}`}
          placeholder={placeholder}
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-expanded={open && suggestions.length > 0}
          aria-controls="search-suggestions"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100"
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </form>

      {open && query.trim().length > 0 && (
        <div
          id="search-suggestions"
          className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg"
        >
          {suggestions.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-500">
              No products match “{query}”. Try a bike model like “CD 70”.
            </p>
          ) : (
            <ul role="listbox" aria-label="Product suggestions">
              {suggestions.map((product, index) => (
                <li key={product.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      index === activeIndex ? 'bg-ink-100' : 'hover:bg-ink-50'
                    }`}
                    onClick={() => {
                      setOpen(false);
                      onSubmitted?.();
                      navigate(`/shop/${product.slug}`);
                    }}
                  >
                    <ProductImage src={product.image} fallback={product.fallbackImage} alt="" className="size-10 rounded-md object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">{product.name}</span>
                      <span className="block truncate text-xs text-ink-500">{product.compatibleBikes.join(', ')}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-ink-900">{formatPKR(product.price)}</span>
                  </button>
                </li>
              ))}
              <li className="border-t border-ink-100">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-brand-600 hover:bg-ink-50"
                  onClick={() => goToSearch(query)}
                >
                  See all results for “{query}”
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
