import { Router } from 'express';
import { z } from 'zod';
import { LocationType } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { nonEmpty, optionalText, parse } from '../lib/validate.js';
import { conflict, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { auditFromRequest } from '../services/audit.js';
import { num } from '../lib/money.js';

export const locationsRouter = Router();

const locationInput = z.object({
  name: nonEmpty('Location name', 80),
  code: nonEmpty('Location code', 12).transform((v) => v.toUpperCase()),
  type: z.nativeEnum(LocationType).default(LocationType.STORE),
  address: optionalText(300),
  city: optionalText(80),
  isActive: z.coerce.boolean().default(true),
  isDefault: z.coerce.boolean().default(false),
});

locationsRouter.get(
  '/',
  requirePermission('location:view'),
  asyncHandler(async (_req, res) => {
    const locations = await prisma.location.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
    const totals = await prisma.inventory.groupBy({
      by: ['locationId'],
      _sum: { quantity: true },
    });
    const values = await prisma.$queryRaw<{ locationId: string; costValue: string; retailValue: string }[]>`
      SELECT i."locationId",
             COALESCE(SUM(i.quantity * v."costPrice"), 0)    AS "costValue",
             COALESCE(SUM(i.quantity * v."sellingPrice"), 0) AS "retailValue"
      FROM "Inventory" i
      JOIN "ProductVariant" v ON v.id = i."variantId"
      GROUP BY i."locationId"
    `;
    res.json({
      data: locations.map((location) => {
        const value = values.find((v) => v.locationId === location.id);
        return {
          ...location,
          totalUnits: totals.find((t) => t.locationId === location.id)?._sum.quantity ?? 0,
          costValue: num(value?.costValue ?? 0),
          retailValue: num(value?.retailValue ?? 0),
        };
      }),
    });
  }),
);

locationsRouter.post(
  '/',
  requirePermission('location:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(locationInput, req.body);
    const location = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.location.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.location.create({ data: input });
    });
    await auditFromRequest(req, {
      action: 'location.created',
      entity: 'Location',
      entityId: location.id,
      after: location,
    });
    res.status(201).json({ data: location });
  }),
);

locationsRouter.put(
  '/:id',
  requirePermission('location:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(locationInput.partial(), req.body);
    const before = await prisma.location.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Location');

    const location = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.location.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.location.update({ where: { id: req.params.id }, data: input });
    });
    await auditFromRequest(req, {
      action: 'location.updated',
      entity: 'Location',
      entityId: location.id,
      before,
      after: location,
    });
    res.json({ data: location });
  }),
);

locationsRouter.delete(
  '/:id',
  requirePermission('location:manage'),
  asyncHandler(async (req, res) => {
    const location = await prisma.location.findUnique({ where: { id: req.params.id } });
    if (!location) throw notFound('Location');

    const stock = await prisma.inventory.aggregate({
      where: { locationId: location.id },
      _sum: { quantity: true },
    });
    if ((stock._sum.quantity ?? 0) > 0) {
      throw conflict(
        `${location.name} still holds ${stock._sum.quantity} units. Transfer the stock out before deleting it.`,
      );
    }
    const movements = await prisma.stockMovement.count({ where: { locationId: location.id } });
    if (movements > 0) {
      throw conflict(
        `${location.name} has stock history and cannot be deleted. Deactivate it instead to keep the records auditable.`,
      );
    }
    await prisma.location.delete({ where: { id: location.id } });
    await auditFromRequest(req, {
      action: 'location.deleted',
      entity: 'Location',
      entityId: location.id,
      before: location,
    });
    res.json({ ok: true });
  }),
);
