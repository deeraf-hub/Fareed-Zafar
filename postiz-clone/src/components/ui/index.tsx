"use client";

import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
  const variants: Record<Variant, string> = {
    primary: "bg-primary text-white hover:bg-primary-hover shadow-[0_0_0_1px_#7c3aed33]",
    secondary: "bg-surface-2 text-text border border-border hover:border-border-strong hover:bg-[#201f2e]",
    ghost: "text-muted hover:text-text hover:bg-white/5",
    danger: "bg-danger/15 text-[#ff8a8e] border border-danger/30 hover:bg-danger/25",
    outline: "border border-border-strong text-text hover:bg-white/5",
  };
  const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-white/5 text-muted border-border",
    primary: "bg-primary/15 text-accent border-primary/30",
    success: "bg-success/15 text-[#5fd99a] border-success/30",
    warning: "bg-warning/15 text-[#f3c57a] border-warning/30",
    danger: "bg-danger/15 text-[#ff8a8e] border-danger/30",
    info: "bg-info/15 text-[#7fb3f3] border-info/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        checked ? "bg-primary border-primary" : "bg-surface-2 border-border-strong",
      )}
    >
      <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-6xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cn("flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl", sizes[size])}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="text-sm font-semibold">{title}</div>
            <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-text" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-muted">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-faint">{hint}</div>}
    </label>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-accent">{icon}</div>}
      <div className="text-sm font-semibold">{title}</div>
      {description && <div className="mt-1 max-w-sm text-xs text-muted">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
