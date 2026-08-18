import type { NextFunction, Request, Response } from 'express';

/**
 * Wraps an async route handler so a rejected promise reaches the Express error
 * middleware instead of hanging the request.
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
