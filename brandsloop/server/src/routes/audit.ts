import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { listQuery, pageMeta, paginate, parse } from '../lib/validate.js';
import { requirePermission } from '../middleware/auth.js';
import { csvFilename, toCsv } from '../lib/csv.js';

export const auditRouter = Router();

auditRouter.get(
  '/',
  requirePermission('audit:view'),
  asyncHandler(async (req, res) => {
    const query = parse(
      listQuery.extend({
        action: z.string().trim().optional(),
        entity: z.string().trim().optional(),
        userId: z.string().trim().optional(),
        format: z.enum(['json', 'csv']).default('json'),
      }),
      req.query,
    );

    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.entity) where.entity = query.entity;
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entity: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        ...(query.format === 'csv' ? { skip: 0, take: 5000 } : paginate(query)),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
    ]);

    if (query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${csvFilename('audit-log')}"`);
      res.send(
        toCsv(logs, [
          { header: 'Date', value: (log) => log.createdAt },
          { header: 'User', value: (log) => log.user?.name ?? 'System' },
          { header: 'Role', value: (log) => log.user?.role ?? '' },
          { header: 'Action', value: (log) => log.action },
          { header: 'Entity', value: (log) => log.entity },
          { header: 'Entity ID', value: (log) => log.entityId },
          { header: 'Before', value: (log) => (log.before ? JSON.stringify(log.before) : '') },
          { header: 'After', value: (log) => (log.after ? JSON.stringify(log.after) : '') },
          { header: 'IP', value: (log) => log.ip },
        ]),
      );
      return;
    }

    res.json({ data: logs, meta: pageMeta(total, query) });
  }),
);

auditRouter.get(
  '/actions',
  requirePermission('audit:view'),
  asyncHandler(async (_req, res) => {
    const [actions, entities] = await Promise.all([
      prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
      prisma.auditLog.findMany({ distinct: ['entity'], select: { entity: true }, orderBy: { entity: 'asc' } }),
    ]);
    res.json({
      data: { actions: actions.map((a) => a.action), entities: entities.map((e) => e.entity) },
    });
  }),
);
