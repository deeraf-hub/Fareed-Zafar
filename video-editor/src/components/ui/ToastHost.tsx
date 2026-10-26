import { useEffect } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useUIStore, type Toast } from '@/store/uiStore';

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUIStore((s) => s.dismissToast);
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), toast.timeout);
    return () => clearTimeout(t);
  }, [toast, dismiss]);
  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? XCircle : toast.kind === 'warning' ? AlertTriangle : Info;
  return (
    <div
      role="status"
      className={clsx(
        'pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg',
        toast.kind === 'error' && 'border-red-700/60 bg-red-950/90 text-red-100',
        toast.kind === 'success' && 'border-emerald-700/60 bg-emerald-950/90 text-emerald-100',
        toast.kind === 'warning' && 'border-amber-700/60 bg-amber-950/90 text-amber-100',
        toast.kind === 'info' && 'border-ink-600 bg-ink-800/95 text-ink-100',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1 break-words">{toast.message}</span>
      <button type="button" aria-label="Dismiss" className="opacity-70 hover:opacity-100" onClick={() => dismiss(toast.id)}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
