import { useState, type MouseEvent } from 'react'
import type { ImageAsset } from '@/types'
import { SmartImage } from '@/components/ui/SmartImage'
import { Modal } from '@/components/ui/Modal'
import { resolveImage } from '@/lib/imagery'
import { ZoomIcon } from '@/components/ui/icons'

interface ProductGalleryProps {
  images: ImageAsset[]
  name: string
}

/** Main image with hover-to-zoom, thumbnail rail and a click-through lightbox. */
export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [zooming, setZooming] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const active = images[activeIndex]

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setOrigin(`${x}% ${y}%`)
  }

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-6">
      <ul className="flex gap-3 overflow-x-auto no-scrollbar lg:w-24 lg:flex-col lg:overflow-visible">
        {images.map((image, index) => (
          <li key={image.id} className="w-20 shrink-0 lg:w-full">
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1} of ${name}`}
              aria-current={index === activeIndex}
              className={`block w-full border transition-colors duration-300 ${
                index === activeIndex ? 'border-champagne-400' : 'border-transparent hover:border-linen'
              }`}
            >
              <SmartImage image={image} ratio="aspect-square" width={200} height={200} sizes="96px" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative flex-1">
        <div
          className="group relative cursor-zoom-in overflow-hidden bg-cream"
          onMouseEnter={() => setZooming(true)}
          onMouseLeave={() => setZooming(false)}
          onMouseMove={handleMove}
          onClick={() => setLightboxOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') setLightboxOpen(true)
          }}
          aria-label={`Enlarge image of ${name}`}
        >
          <img
            src={resolveImage(active, { width: 1200, height: 1500 })}
            alt={active?.alt ?? name}
            width={1200}
            height={1500}
            className="aspect-[4/5] w-full object-cover transition-transform duration-500 ease-luxe"
            style={{ transform: zooming ? 'scale(1.9)' : 'scale(1)', transformOrigin: origin }}
          />
          <span className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 bg-ivory/90 px-3 py-1.5 text-[10px] uppercase tracking-wideish text-navy-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <ZoomIcon width={14} height={14} />
            Zoom
          </span>
        </div>
      </div>

      <Modal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        label={`${name} enlarged`}
        className="sm:max-w-4xl"
      >
        <img
          src={resolveImage(active, { width: 1600, height: 2000 })}
          alt={active?.alt ?? name}
          className="h-auto w-full object-contain"
        />
      </Modal>
    </div>
  )
}
