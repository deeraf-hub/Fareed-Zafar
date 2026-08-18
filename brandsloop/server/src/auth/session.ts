import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { Role } from '@prisma/client';
import { env } from '../env.js';

export const SESSION_COOKIE = 'brandsloop_session';

export interface SessionPayload {
  sub: string;
  email: string;
  role: Role;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: `${env.sessionHours}h` });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === 'string') return null;
    return decoded as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: env.sessionHours * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    path: '/',
  });
}
