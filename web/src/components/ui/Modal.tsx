import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Accessible dialog: focus moves in, Escape closes, background scroll locks. */
export const Modal = ({ open, onClose, title, children }: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink-950/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-xl focus:outline-none sm:rounded-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex size-10 items-center justify-center rounded-full bg-white/90 text-ink-600 transition-colors hover:bg-ink-100"
          aria-label="Close dialog"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
};
