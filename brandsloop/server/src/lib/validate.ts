import { z, ZodError, type ZodTypeAny } from 'zod';
import { badRequest } from './errors.js';

/** Parses input with a Zod schema and converts failures into a friendly 400. */
export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      }));
      const first = details[0];
      throw badRequest(
        first ? `${first.field}: ${first.message}` : 'The submitted data is not valid.',
        details,
      );
    }
    throw error;
  }
}

/** Money fields: accept numbers or numeric strings, reject negatives and NaN. */
export const money = (label = 'Amount') =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number.` })
    .finite(`${label} must be a valid number.`)
    .min(0, `${label} cannot be negative.`)
    .max(9_999_999_999, `${label} is too large.`);

export const quantity = (label = 'Quantity') =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(0, `${label} cannot be negative.`)
    .max(10_000_000, `${label} is too large.`);

export const positiveQuantity = (label = 'Quantity') =>
  quantity(label).min(1, `${label} must be at least 1.`);

export const nonEmpty = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v));

export const optionalId = z
  .string()
  .trim()
  .min(1)
  .optional()
  .nullable()
  .transform((v) => (v === '' ? null : v));

export const dateInput = z.coerce.date();

/** Shared list/query parameters used by every paginated table endpoint. */
export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().trim().max(200).optional(),
  sortBy: z.string().trim().max(60).optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListQuery = z.infer<typeof listQuery>;

export function paginate(query: { page: number; pageSize: number }) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function pageMeta(total: number, query: { page: number; pageSize: number }) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/**
 * Whitelists a sort column. Client-supplied column names never reach Prisma
 * directly — an unknown value silently falls back to the default.
 */
export function orderBy(
  sortBy: string | undefined,
  sortDir: 'asc' | 'desc',
  allowed: Record<string, unknown>,
  fallback: string,
): Record<string, unknown> {
  const key = sortBy && sortBy in allowed ? sortBy : fallback;
  const template = allowed[key];
  if (typeof template === 'function') return (template as (d: 'asc' | 'desc') => any)(sortDir);
  return { [key]: sortDir };
}
