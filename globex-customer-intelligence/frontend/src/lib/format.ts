import type { IndicatorUnit } from '../api/types';

export const EM_DASH = '—';

const LOCALE = 'en-GB';

const gbpWhole = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const gbpPence = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatters = new Map<number, Intl.NumberFormat>();
const numberFormatters = new Map<string, Intl.NumberFormat>();

const dateOnlyUtc = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateLocal = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeLocal = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const monthUtc = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** GBP with en-GB grouping: no pence at or above £1,000, otherwise two decimals. */
export function formatGBP(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return EM_DASH;
  return Math.abs(value) >= 1000 ? gbpWhole.format(value) : gbpPence.format(value);
}

/** Percentage from a 0..1 ratio, e.g. 0.1234 -> "12.3%". */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (!isFiniteNumber(value)) return EM_DASH;
  let formatter = percentFormatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'percent',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    percentFormatters.set(digits, formatter);
  }
  return formatter.format(value);
}

/** Grouped number with a fixed number of decimals. */
export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (!isFiniteNumber(value)) return EM_DASH;
  const key = `${digits}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    numberFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

/** Model metric values: up to 3 decimals for small numbers, 1 decimal for large ones. */
export function formatMetric(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return EM_DASH;
  if (Number.isInteger(value)) return formatNumber(value, 0);
  if (Math.abs(value) >= 100) return formatNumber(value, 1);
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(value);
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_ONLY = /^(\d{4})-(\d{2})$/;

/**
 * Parses an API date. Date-only strings (YYYY-MM-DD) are treated as calendar dates
 * (UTC midnight) so they never shift by a day in other time zones.
 */
export function parseIsoDate(value: string): { date: Date; dateOnly: boolean } | null {
  const dateMatch = DATE_ONLY.exec(value);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : { date, dateOnly: true };
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false };
}

/** "9 Dec 2011" from a date or timestamp string. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const parsed = parseIsoDate(value);
  if (!parsed) return EM_DASH;
  return parsed.dateOnly ? dateOnlyUtc.format(parsed.date) : dateLocal.format(parsed.date);
}

/** "9 Dec 2011, 12:50" from a timestamp string. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const parsed = parseIsoDate(value);
  if (!parsed) return EM_DASH;
  if (parsed.dateOnly) return dateOnlyUtc.format(parsed.date);
  return dateTimeLocal.format(parsed.date);
}

/** "Mar 2011" from "2011-03" (also accepts full dates). */
export function formatMonth(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const monthMatch = MONTH_ONLY.exec(value);
  if (monthMatch) {
    const date = new Date(Date.UTC(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1));
    return Number.isNaN(date.getTime()) ? value : monthUtc.format(date);
  }
  const parsed = parseIsoDate(value);
  return parsed ? monthUtc.format(parsed.date) : value;
}

/** "1 Dec 2010 – 9 Dec 2011" from a [start, end] tuple. */
export function formatPeriod(period: readonly [string, string] | null | undefined): string {
  if (!period) return EM_DASH;
  return `${formatDate(period[0])} – ${formatDate(period[1])}`;
}

/** "12 days" / "1 day". */
export function formatDays(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return EM_DASH;
  const rounded = Math.round(value);
  return `${formatNumber(rounded)} ${rounded === 1 ? 'day' : 'days'}`;
}

/** Formats a behavioural indicator value by its unit. */
export function formatIndicator(value: number | null | undefined, unit: IndicatorUnit): string {
  if (!isFiniteNumber(value)) return EM_DASH;
  switch (unit) {
    case 'days':
      return formatDays(value);
    case 'gbp':
      return formatGBP(value);
    case 'count':
      return Number.isInteger(value) ? formatNumber(value) : formatNumber(value, 1);
    case 'ratio':
      return formatNumber(value, 2);
    default:
      return formatNumber(value, 2);
  }
}

/** Human-readable byte size, e.g. "22.6 MB". */
export function formatBytes(bytes: number | null | undefined): string {
  if (!isFiniteNumber(bytes)) return EM_DASH;
  if (bytes < 1024) return `${formatNumber(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${formatNumber(value, 1)} ${units[unitIndex] ?? ''}`.trim();
}

/** "average_precision" -> "Average precision". */
export function humanize(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Text fallback for nullable strings. */
export function textOrDash(value: string | null | undefined): string {
  return value && value.trim() ? value : EM_DASH;
}
