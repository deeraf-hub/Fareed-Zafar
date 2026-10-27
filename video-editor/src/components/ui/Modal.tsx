import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { IconButton } from './IconButton';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'md',
  closable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
  closable?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, closable]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && closable) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'w-full rounded-xl border border-ink-700 bg-ink-900 shadow-2xl',
          width === 'sm' && 'max-w-sm',
          width === 'md' && 'max-w-lg',
          width === 'lg' && 'max-w-2xl',
        )}
      >
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {closable && (
            <IconButton label="Close" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-700 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
