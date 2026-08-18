import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { unauthorized, badRequest } from '../lib/errors.js';
import { hashPassword, passwordProblems, verifyPassword } from '../auth/password.js';
import { clearSessionCookie, setSessionCookie, signSession } from '../auth/session.js';
import { authenticate } from '../middleware/auth.js';
import { permissionsFor } from '../lib/permissions.js';
import { recordAudit } from '../services/audit.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    // Same message for unknown email and wrong password: revealing which one
    // was wrong lets an attacker enumerate valid staff accounts.
    const invalid = unauthorized('Incorrect email or password.');
    if (!user) {
      await hashPassword('timing-equaliser');
      throw invalid;
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw invalid;
    if (!user.isActive) {
      throw unauthorized('This account has been deactivated. Please contact an administrator.');
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = signSession({ sub: user.id, email: user.email, role: user.role });
    setSessionCookie(res, token);
    await recordAudit({ userId: user.id, action: 'user.login', entity: 'User', entityId: user.id, ip: req.ip });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: permissionsFor(user.role),
      },
      token,
    });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    res.json({
      user: { ...user, permissions: permissionsFor(user.role) },
    });
  }),
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Please enter your current password.'),
  newPassword: z.string().min(1, 'Please enter a new password.'),
});

authRouter.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw badRequest('Your current password is not correct.');

    const problems = passwordProblems(newPassword);
    if (problems.length > 0) {
      throw badRequest(`Your new password must ${problems.join(', ')}.`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await recordAudit({
      userId: user.id,
      action: 'user.password_changed',
      entity: 'User',
      entityId: user.id,
      ip: req.ip,
    });
    res.json({ ok: true });
  }),
);
