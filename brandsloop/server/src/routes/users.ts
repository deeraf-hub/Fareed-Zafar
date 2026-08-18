import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { listQuery, nonEmpty, optionalText, pageMeta, paginate, parse } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { hashPassword, passwordProblems } from '../auth/password.js';
import { auditFromRequest } from '../services/audit.js';
import { permissionsFor, ROLE_PERMISSIONS } from '../lib/permissions.js';

export const usersRouter = Router();

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

usersRouter.get(
  '/roles',
  requirePermission('user:manage'),
  asyncHandler(async (_req, res) => {
    res.json({
      data: (Object.keys(ROLE_PERMISSIONS) as Role[]).map((role) => ({
        role,
        permissions: permissionsFor(role),
      })),
    });
  }),
);

usersRouter.get(
  '/',
  requirePermission('user:manage'),
  asyncHandler(async (req, res) => {
    const query = parse(listQuery.extend({ role: z.nativeEnum(Role).optional() }), req.query);
    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, ...paginate(query), orderBy: { createdAt: 'desc' }, select: SAFE_SELECT }),
    ]);
    res.json({ data: users, meta: pageMeta(total, query) });
  }),
);

const createUserSchema = z.object({
  name: nonEmpty('Full name', 120),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please set a password.'),
  role: z.nativeEnum(Role).default(Role.STAFF),
  phone: optionalText(40),
  isActive: z.coerce.boolean().default(true),
});

usersRouter.post(
  '/',
  requirePermission('user:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(createUserSchema, req.body);
    const problems = passwordProblems(input.password);
    if (problems.length > 0) throw badRequest(`The password must ${problems.join(', ')}.`);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        phone: input.phone ?? null,
        isActive: input.isActive,
        passwordHash: await hashPassword(input.password),
      },
      select: SAFE_SELECT,
    });
    await auditFromRequest(req, {
      action: 'user.created',
      entity: 'User',
      entityId: user.id,
      after: { email: user.email, role: user.role },
    });
    res.status(201).json({ data: user });
  }),
);

const updateUserSchema = z.object({
  name: nonEmpty('Full name', 120).optional(),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.').optional(),
  role: z.nativeEnum(Role).optional(),
  phone: optionalText(40),
  isActive: z.coerce.boolean().optional(),
  password: z.string().optional(),
});

usersRouter.put(
  '/:id',
  requirePermission('user:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(updateUserSchema, req.body);
    const before = await prisma.user.findUnique({ where: { id: req.params.id }, select: SAFE_SELECT });
    if (!before) throw notFound('User');

    // Guard rails: an admin must not be able to lock the business out of its
    // own system by demoting or disabling the last remaining admin.
    if (before.role === Role.ADMIN && (input.role && input.role !== Role.ADMIN || input.isActive === false)) {
      const otherAdmins = await prisma.user.count({
        where: { role: Role.ADMIN, isActive: true, id: { not: before.id } },
      });
      if (otherAdmins === 0) {
        throw badRequest('This is the only active administrator. Promote another user first.');
      }
    }
    if (input.password) {
      const problems = passwordProblems(input.password);
      if (problems.length > 0) throw badRequest(`The password must ${problems.join(', ')}.`);
    }

    const user = await prisma.user.update({
      where: { id: before.id },
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        phone: input.phone,
        isActive: input.isActive,
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
      select: SAFE_SELECT,
    });
    await auditFromRequest(req, {
      action: input.role && input.role !== before.role ? 'user.permission_changed' : 'user.updated',
      entity: 'User',
      entityId: user.id,
      before: { role: before.role, isActive: before.isActive, email: before.email },
      after: { role: user.role, isActive: user.isActive, email: user.email },
    });
    res.json({ data: user });
  }),
);

usersRouter.delete(
  '/:id',
  requirePermission('user:manage'),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: SAFE_SELECT });
    if (!user) throw notFound('User');
    if (user.id === req.user!.id) throw badRequest('You cannot deactivate your own account.');
    if (user.role === Role.ADMIN) {
      const otherAdmins = await prisma.user.count({
        where: { role: Role.ADMIN, isActive: true, id: { not: user.id } },
      });
      if (otherAdmins === 0) throw badRequest('This is the only active administrator.');
    }

    // Users are deactivated, never deleted — their name stays attached to every
    // sale, purchase and stock movement they recorded.
    const deactivated = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
      select: SAFE_SELECT,
    });
    await auditFromRequest(req, {
      action: 'user.deactivated',
      entity: 'User',
      entityId: user.id,
      before: { isActive: true },
      after: { isActive: false },
    });
    res.json({ data: deactivated, message: `${user.name} can no longer sign in.` });
  }),
);
