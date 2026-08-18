/**
 * Application errors carry a safe, human-readable message plus an HTTP status.
 * Anything that is NOT an AppError is treated as an internal fault: it is
 * logged in full and reported to the client as a generic message, so raw
 * database/stack details never reach the browser.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = 'BAD_REQUEST',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(message, 400, 'BAD_REQUEST', details);

export const unauthorized = (message = 'Please sign in to continue.') =>
  new AppError(message, 401, 'UNAUTHORIZED');

export const forbidden = (message = 'You do not have permission to do that.') =>
  new AppError(message, 403, 'FORBIDDEN');

export const notFound = (what = 'Record') => new AppError(`${what} not found.`, 404, 'NOT_FOUND');

export const conflict = (message: string) => new AppError(message, 409, 'CONFLICT');

/** Raised when an operation would push stock below zero. */
export const insufficientStock = (message: string) =>
  new AppError(message, 409, 'INSUFFICIENT_STOCK');
