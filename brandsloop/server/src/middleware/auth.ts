import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../db.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { can, type Permission } from '../lib/permissions.js';
import { SESSION_COOKIE, verifySession } from '../auth/session.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function readToken(req: Request): string | null {
  const cookie = req.cookies?.[SESSION_COOKIE];
  if (typeof cookie === 'string' && cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Resolves the signed session into a live user record. The database lookup is
 * deliberate: deactivating a user must revoke access immediately rather than
 * waiting for their JWT to expire.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readToken(req);
    if (!token) return next(unauthorized());
    const payload = verifySession(token);
    if (!payload) return next(unauthorized('Your session has expired. Please sign in again.'));

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user) return next(unauthorized('Your session is no longer valid.'));
    if (!user.isActive) return next(forbidden('This account has been deactivated.'));

    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Route-level permission gate. This is the real access control — the client
 * hides buttons for convenience, but every request is checked here.
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    const missing = permissions.filter((permission) => !can(req.user!.role, permission));
    if (missing.length > 0) {
      return next(
        forbidden(
          `Your role (${req.user.role.toLowerCase()}) does not allow this action.`,
        ),
      );
    }
    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
