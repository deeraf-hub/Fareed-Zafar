import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { env } from '../env.js';

function fieldList(meta: unknown): string {
  const target = (meta as { target?: unknown } | undefined)?.target;
  if (Array.isArray(target)) return target.join(', ');
  if (typeof target === 'string') return target;
  return 'field';
}

/**
 * Translates internal failures into messages a shop assistant can act on.
 * Prisma error codes are mapped explicitly; anything unrecognised is logged
 * and reported generically so implementation details never leak.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { message: error.message, code: error.code, details: error.details },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const field = fieldList(error.meta);
      res.status(409).json({
        error: {
          message: `That ${field} is already in use. Please enter a different value.`,
          code: 'DUPLICATE',
        },
      });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({
        error: { message: 'The record you are looking for no longer exists.', code: 'NOT_FOUND' },
      });
      return;
    }
    if (error.code === 'P2003') {
      res.status(409).json({
        error: {
          message:
            'This record is still linked to other records and cannot be changed or removed.',
          code: 'IN_USE',
        },
      });
      return;
    }
  }

  // Unexpected: log the full technical detail server-side only.
  console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  res.status(500).json({
    error: {
      message: 'Something went wrong on our side. Please try again.',
      code: 'INTERNAL_ERROR',
      ...(env.isProduction ? {} : { debug: error instanceof Error ? error.message : String(error) }),
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: 'Endpoint not found.', code: 'NOT_FOUND' } });
}
