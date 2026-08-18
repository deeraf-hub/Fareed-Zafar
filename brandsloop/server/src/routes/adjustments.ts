import { Router } from 'express';
import { AdjustmentReason, MovementType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { listQuery, nonEmpty, optionalText, pageMeta, paginate, parse, quantity } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { applyStockChange } from '../services/inventory.js';
import { nextNumber, withNumberRetry } from '../services/numbering.js';
import { auditFromRequest } from '../services/audit.js';
import { refreshStockAlerts } from '../services/notifications.js';

export const adjustmentsRouter = Router();

const adjustmentInput = z.object({
  locationId: nonEmpty('Location'),
  reason: z.nativeEnum(AdjustmentReason, {
    errorMap: () => ({ message: 'Please choose a reason for this adjustment.' }),
  }),
  notes: optionalText(1000),
  items: z
    .array(
      z.object({
        variantId: nonEmpty('Product variant'),
        newQty: quantity('New stock level'),
      }),
    )
    .min(1, 'Add at least one product to adjust.'),
});

adjustmentsRouter.get(
  '/',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const query = parse(
      listQuery.extend({
        locationId: z.string().trim().optional(),
        reason: z.nativeEnum(AdjustmentReason).optional(),
      }),
      req.query,
    );
    const where: Prisma.StockAdjustmentWhereInput = {};
    if (query.locationId) where.locationId = query.locationId;
    if (query.reason) where.reason = query.reason;
    if (query.from || query.to) {
      where.adjustedAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, adjustments] = await Promise.all([
      prisma.stockAdjustment.count({ where }),
      prisma.stockAdjustment.findMany({
        where,
        ...paginate(query),
        orderBy: { adjustedAt: query.sortDir },
        include: {
          location: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
          items: {
            include: {
              variant: {
                select: { sku: true, size: true, color: true, product: { select: { name: true } } },
              },
            },
          },
        },
      }),
    ]);
    res.json({ data: adjustments, meta: pageMeta(total, query) });
  }),
);

adjustmentsRouter.get(
  '/:id',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            variant: {
              select: { id: true, sku: true, size: true, color: true, product: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!adjustment) throw notFound('Stock adjustment');
    res.json({ data: adjustment });
  }),
);

adjustmentsRouter.post(
  '/',
  requirePermission('inventory:adjust'),
  asyncHandler(async (req, res) => {
    const input = parse(adjustmentInput, req.body);
    const userId = req.user!.id;

    const duplicate = input.items
      .map((item) => item.variantId)
      .find((id, index, all) => all.indexOf(id) !== index);
    if (duplicate) throw badRequest('The same product appears more than once in this adjustment.');

    const adjustment = await withNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const number = await nextNumber(tx, 'stockAdjustment');
        const created = await tx.stockAdjustment.create({
          data: {
            number,
            locationId: input.locationId,
            reason: input.reason,
            notes: input.notes ?? null,
            createdById: userId,
          },
        });

        for (const item of input.items) {
          const existing = await tx.inventory.findUnique({
            where: { variantId_locationId: { variantId: item.variantId, locationId: input.locationId } },
            select: { quantity: true },
          });
          const previousQty = existing?.quantity ?? 0;
          const difference = item.newQty - previousQty;
          if (difference === 0) continue;

          await applyStockChange(tx, {
            variantId: item.variantId,
            locationId: input.locationId,
            delta: difference,
            type:
              input.reason === AdjustmentReason.DAMAGED
                ? MovementType.DAMAGED
                : input.reason === AdjustmentReason.LOST
                  ? MovementType.LOST
                  : input.reason === AdjustmentReason.OPENING_STOCK
                    ? MovementType.OPENING_STOCK
                    : MovementType.ADJUSTMENT,
            userId,
            referenceType: 'StockAdjustment',
            referenceId: created.id,
            referenceNumber: number,
            notes: `${input.reason.replace(/_/g, ' ').toLowerCase()}${input.notes ? ` — ${input.notes}` : ''}`,
            // A correction may legitimately reduce a wrongly-inflated figure,
            // but it can never take the shelf below empty.
            allowNegative: false,
          });

          await tx.stockAdjustmentItem.create({
            data: {
              adjustmentId: created.id,
              variantId: item.variantId,
              previousQty,
              newQty: item.newQty,
              difference,
            },
          });
        }

        const itemCount = await tx.stockAdjustmentItem.count({ where: { adjustmentId: created.id } });
        if (itemCount === 0) {
          throw badRequest('Nothing changed — the new stock levels match the current ones.');
        }

        return tx.stockAdjustment.findUniqueOrThrow({
          where: { id: created.id },
          include: { items: true, location: true },
        });
      }),
    );

    await refreshStockAlerts(input.items.map((item) => item.variantId));
    await auditFromRequest(req, {
      action: 'stock.adjusted',
      entity: 'StockAdjustment',
      entityId: adjustment.id,
      after: {
        number: adjustment.number,
        reason: adjustment.reason,
        items: adjustment.items.map((i) => ({
          variantId: i.variantId,
          from: i.previousQty,
          to: i.newQty,
        })),
      },
    });

    res.status(201).json({ data: adjustment });
  }),
);
