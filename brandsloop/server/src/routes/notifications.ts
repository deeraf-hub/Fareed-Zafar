import { Router } from 'express';
import { NotificationType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { listQuery, pageMeta, paginate, parse } from '../lib/validate.js';
import { requirePermission } from '../middleware/auth.js';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  requirePermission('notification:view'),
  asyncHandler(async (req, res) => {
    const query = parse(
      listQuery.extend({
        type: z.nativeEnum(NotificationType).optional(),
        unreadOnly: z.coerce.boolean().default(false),
      }),
      req.query,
    );
    const where: Prisma.NotificationWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.unreadOnly) where.isRead = false;

    const [total, unread, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { isRead: false } }),
      prisma.notification.findMany({
        where,
        ...paginate(query),
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    res.json({ data: notifications, meta: { ...pageMeta(total, query), unread } });
  }),
);

notificationsRouter.post(
  '/:id/read',
  requirePermission('notification:view'),
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ data: notification });
  }),
);

notificationsRouter.post(
  '/read-all',
  requirePermission('notification:view'),
  asyncHandler(async (_req, res) => {
    const result = await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true, updated: result.count });
  }),
);

notificationsRouter.delete(
  '/:id',
  requirePermission('notification:view'),
  asyncHandler(async (req, res) => {
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);
