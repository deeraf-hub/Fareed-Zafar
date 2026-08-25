import { useEffect } from 'react';

/** Closes an overlay when Escape is pressed, while it is open. */
export const useEscapeKey = (active: boolean, onEscape: () => void): void => {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active, onEscape]);
};
