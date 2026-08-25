import { useEffect, useState } from 'react';

interface ProductImageProps {
  /** Product photograph — a remote CDN URL. */
  src: string;
  /** Local illustration shown if the photograph fails to load. */
  fallback: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  /** Above-the-fold images load eagerly; everything else waits. */
  priority?: boolean;
}

/**
 * Product photograph with a guaranteed fallback: if the photo cannot be
 * fetched — offline, CDN blocked, bad URL — the local illustration takes its
 * place, so a product never renders a broken image.
 */
export const ProductImage = ({
  src,
  fallback,
  alt,
  className,
  width = 800,
  height = 600,
  priority = false,
}: ProductImageProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <img
      src={failed || !src ? fallback : src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  );
};
