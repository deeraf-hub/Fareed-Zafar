import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatDays,
  formatGBP,
  formatIndicator,
  formatMetric,
  formatMonth,
  formatNumber,
  formatPercent,
  formatPeriod,
  humanize,
} from '../lib/format';

describe('formatGBP', () => {
  it('uses no pence at or above £1,000', () => {
    expect(formatGBP(1234.56)).toBe('£1,235');
    expect(formatGBP(8887209.5)).toBe('£8,887,210');
    expect(formatGBP(1000)).toBe('£1,000');
  });

  it('uses two decimals below £1,000', () => {
    expect(formatGBP(12.5)).toBe('£12.50');
    expect(formatGBP(0)).toBe('£0.00');
    expect(formatGBP(999.99)).toBe('£999.99');
  });

  it('handles negatives and missing values', () => {
    expect(formatGBP(-45.5)).toBe('-£45.50');
    expect(formatGBP(-2500)).toBe('-£2,500');
    expect(formatGBP(null)).toBe('—');
    expect(formatGBP(undefined)).toBe('—');
    expect(formatGBP(Number.NaN)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('formats a 0..1 ratio with one decimal by default', () => {
    expect(formatPercent(0.1234)).toBe('12.3%');
    expect(formatPercent(1)).toBe('100.0%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('respects the digits argument', () => {
    expect(formatPercent(0.1234, 0)).toBe('12%');
    expect(formatPercent(0.1234, 2)).toBe('12.34%');
  });

  it('returns a dash for missing values', () => {
    expect(formatPercent(null)).toBe('—');
  });
});

describe('formatDate / formatDateTime / formatMonth', () => {
  it('formats date-only strings without time-zone drift', () => {
    expect(formatDate('2011-12-09')).toBe('9 Dec 2011');
    expect(formatDate('2010-01-01')).toBe('1 Jan 2010');
  });

  it('formats timestamps as dates', () => {
    expect(formatDate('2011-12-09T12:50:00')).toBe('9 Dec 2011');
  });

  it('formats timestamps with time', () => {
    expect(formatDateTime('2011-12-09T12:50:00')).toMatch(/^9 Dec 2011,? 12:50$/);
  });

  it('formats months', () => {
    expect(formatMonth('2011-03')).toBe('Mar 2011');
    expect(formatMonth('2011-03-15')).toBe('Mar 2011');
  });

  it('returns a dash for null or invalid input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not a date')).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
  });

  it('formats periods', () => {
    expect(formatPeriod(['2010-12-01', '2011-06-30'])).toBe('1 Dec 2010 – 30 Jun 2011');
    expect(formatPeriod(null)).toBe('—');
  });
});

describe('formatNumber and friends', () => {
  it('groups thousands', () => {
    expect(formatNumber(19960)).toBe('19,960');
    expect(formatNumber(1234.567, 1)).toBe('1,234.6');
    expect(formatNumber(null)).toBe('—');
  });

  it('formats metrics generically', () => {
    expect(formatMetric(0.4321)).toBe('0.432');
    expect(formatMetric(0.5)).toBe('0.5');
    expect(formatMetric(1234.56)).toBe('1,234.6');
    expect(formatMetric(3)).toBe('3');
    expect(formatMetric(null)).toBe('—');
  });

  it('formats days and indicators by unit', () => {
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(12.4)).toBe('12 days');
    expect(formatIndicator(12, 'days')).toBe('12 days');
    expect(formatIndicator(812.4, 'gbp')).toBe('£812.40');
    expect(formatIndicator(5, 'count')).toBe('5');
    expect(formatIndicator(0.04, 'ratio')).toBe('0.04');
    expect(formatIndicator(null, 'gbp')).toBe('—');
  });

  it('formats bytes and humanises keys', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(23_700_000)).toBe('22.6 MB');
    expect(humanize('average_precision')).toBe('Average precision');
  });
});
