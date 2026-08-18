import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let currencySymbol = 'Rs';
export function setCurrencySymbol(symbol: string) {
  currencySymbol = symbol;
}

/** Money formatter used everywhere so totals read the same on every screen. */
export function money(value: number | string | null | undefined, options: { compact?: boolean } = {}) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return `${currencySymbol} 0`;
  if (options.compact && Math.abs(amount) >= 1_000_000) {
    return `${currencySymbol} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (options.compact && Math.abs(amount) >= 1_000) {
    return `${currencySymbol} ${(amount / 1_000).toFixed(1)}k`;
  }
  return `${currencySymbol} ${amount.toLocaleString('en-PK', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function number(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString('en-PK');
}

export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function relativeTime(value: string | Date) {
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/** "PARTIALLY_RECEIVED" -> "Partially received" */
export function humanize(value: string | null | undefined) {
  if (!value) return '—';
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function variantLabel(variant: { size?: string | null; color?: string | null } | null | undefined) {
  if (!variant) return '—';
  const parts = [variant.color, variant.size].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : 'Standard';
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
