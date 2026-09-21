import { useEffect, useRef, useState } from 'react';

/** Reports whether a horizontally scrollable container currently overflows. */
export function useOverflowHint<E extends HTMLElement = HTMLDivElement>(signature: string) {
  const ref = useRef<E>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const check = () => setOverflowing(element.scrollWidth > element.clientWidth + 1);
    check();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    }
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [signature]);
  return { ref, overflowing };
}
