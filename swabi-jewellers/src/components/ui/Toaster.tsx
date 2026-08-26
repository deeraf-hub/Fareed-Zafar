import { useToast } from '@/context/ToastContext'
import { CheckIcon, CloseIcon } from './icons'

export function Toaster() {
  const { toasts, dismiss } = useToast()
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex animate-slide-down items-center gap-3 border border-linen bg-white px-4 py-3 shadow-lift"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-champagne-100 text-champagne-700">
            <CheckIcon width={15} height={15} />
          </span>
          <p className="flex-1 text-sm text-navy-700">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="text-stoneish transition-colors hover:text-navy-700"
            aria-label="Dismiss notification"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
