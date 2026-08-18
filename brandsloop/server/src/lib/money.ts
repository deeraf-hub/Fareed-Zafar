import { Prisma } from '@prisma/client';

export type Numeric = Prisma.Decimal | number | string | null | undefined;

/** Converts any Prisma Decimal / numeric input into a plain number. */
export function num(value: Numeric): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return value.toNumber();
}

/** Rounds to 2 decimals without floating-point drift (e.g. 1.005 -> 1.01). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(round2(Number(value)));
}

/**
 * Line total = (unit x qty) - discount + tax. Used identically by purchases,
 * sales and returns so a document's arithmetic is always consistent.
 */
export function lineTotal(input: {
  unit: number;
  quantity: number;
  discount?: number;
  tax?: number;
}): number {
  const gross = input.unit * input.quantity;
  return round2(gross - (input.discount ?? 0) + (input.tax ?? 0));
}

export function sum(values: number[]): number {
  return round2(values.reduce((total, value) => total + value, 0));
}
