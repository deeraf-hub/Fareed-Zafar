import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={cn("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#612bd3" />
      <path d="M9 23V9h7.5c3.6 0 6 2.1 6 5.2s-2.4 5.3-6 5.3H13V23H9Zm4-7h3.3c1.5 0 2.4-.7 2.4-1.8S17.8 12.4 16.3 12.4H13V16Z" fill="#fff" />
      <circle cx="23.5" cy="22.5" r="2.5" fill="#c4b5fd" />
    </svg>
  );
}

export function Logo({ className, text = true }: { className?: string; text?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {text && <span className="text-lg font-bold tracking-tight">{BRAND.name}</span>}
    </span>
  );
}
