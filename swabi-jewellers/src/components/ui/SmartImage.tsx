import { useState } from 'react'
import type { ImageAsset } from '@/types'
import { resolveImage } from '@/lib/imagery'

interface SmartImageProps {
  image?: ImageAsset
  className?: string
  /** Tailwind aspect utility for the frame, e.g. `aspect-[4/5]`. */
  ratio?: string
  sizes?: string
  priority?: boolean
  width?: number
  height?: number
}

/**
 * Every image on the site renders through here: lazy by default, async decode,
 * a soft shimmer while it settles, and a graceful fade once it is painted.
 */
export function SmartImage({
  image,
  className = '',
  ratio = 'aspect-[4/5]',
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  priority = false,
  width = 900,
  height = 1200,
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false)
  const src = resolveImage(image, { width, height })

  return (
    <span className={`relative block overflow-hidden bg-cream ${ratio} ${className}`}>
      {!loaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,#F6F1E7_20%,#FDFBF7_45%,#F6F1E7_70%)] bg-[length:1000px_100%]"
        />
      )}
      <img
        src={src}
        alt={image?.alt ?? ''}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-700 ease-luxe ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  )
}
