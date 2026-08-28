import { PHOTOS, type PhotoKey } from '@/assets/photography/photos'

interface PhotoProps {
  photoKey: PhotoKey
  className?: string
  caption?: string
  showCaption?: boolean
  priority?: boolean
}

/**
 * Renders licensed, royalty-free photography (see src/assets/photography/photos.ts).
 * Drop-in replacement for the SVG placeholder system — same overlay-caption
 * API — used everywhere a real product or lifestyle photo is available.
 */
export function Photo({ photoKey, className = '', caption, showCaption, priority = false }: PhotoProps) {
  const photo = PHOTOS[photoKey]

  // See PlaceholderArt for why this can't just be a hardcoded "relative":
  // Tailwind's stylesheet order makes `.relative` always beat a caller's
  // `.absolute`, regardless of class-string order, silently breaking any
  // full-bleed `absolute inset-0` usage.
  const callerSetsPosition = /(^|\s)(absolute|fixed|sticky|static|relative)(\s|$)/.test(className)
  const positionClass = callerSetsPosition ? '' : 'relative'

  return (
    <div className={`${positionClass} overflow-hidden ${className}`}>
      <img
        src={photo.src}
        alt={photo.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="h-full w-full object-cover"
      />
      {showCaption && caption && (
        <div className="pointer-events-none absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
          <span className="bg-ivory/85 px-3 py-1.5 text-[11px] uppercase tracking-widest2 text-charcoal-soft backdrop-blur-sm">
            {caption}
          </span>
        </div>
      )}
    </div>
  )
}
