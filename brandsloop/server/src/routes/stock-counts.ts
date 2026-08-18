import { Router } from 'express';
import { MovementType, Prisma, StockCountStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import {
  listQuery,
  nonEmpty,
  optionalText,
  pageMeta,
  paginate,
  parse,
  quantity,
} from '../lib/validate.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { applyStockChange } from '../services/inventory.js';
import { nextNumber, withNumberRetry } from '../services/numbering.js';
import { auditFromRequest } from '../services/audit.js';
import { refreshStockAlerts } from '../services/notifications.js';

export const stockCountsRouter = Router();

const countInclude = {
  location: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    orderBy: { variant: { sku: 'asc' } },
    include: {
      variant: {
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          costPrice: true,
          product: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.StockCountInclude;

const startCountSchema = z.object({
  locationId: nonEmpty('Location'),
  notes: optionalText(1000),
  /** Limit the sheet to one category; omit to count everything at the location. */
  categoryId: z.string().trim().optional(),
  variantIds: z.array(z.string().trim().min(1)).max(2000).optional(),
});

stockCountsRouter.get(
  '/',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const query = parse(
      listQuery.extend({
        status: z.nativeEnum(StockCountStatus).optional(),
        locationId: z.string().trim().optional(),
      }),
      req.query,
    );
    const where: Prisma.StockCountWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.locationId) where.locationId = query.locationId;
    if (query.search) where.number = { contains: query.search, mode: 'insensitive' };

    const [total, counts] = await Promise.all([
      prisma.stockCount.count({ where }),
      prisma.stockCount.findMany({
        where,
        ...paginate(query),
        orderBy: { startedAt: query.sortDir },
        include: {
          location: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);
    res.json({ data: counts, meta: pageMeta(total, query) });
  }),
);

stockCountsRouter.get(
  '/:id',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const count = await prisma.stockCount.findUnique({
      where: { id: req.params.id },
      include: countInclude,
    });
    if (!count) throw notFound('Stock count');
    res.json({ data: count });
  }),
);

stockCountsRouter.post(
  '/',
  requirePermission('inventory:count'),
  asyncHandler(async (req, res) => {
    const input = parse(startCountSchema, req.body);
    const userId = req.user!.id;

    const location = await prisma.location.findUnique({ where: { id: input.locationId } });
    if (!location) throw notFound('Location');

    const variantWhere: Prisma.ProductVariantWhereInput = { isActive: true };
    if (input.variantIds?.length) variantWhere.id = { in: input.variantIds };
    if (input.categoryId) {
      const children = await prisma.category.findMany({
        where: { parentId: input.categoryId },
        select: { id: true },
      });
      variantWhere.product = { categoryId: { in: [input.categoryId, ...children.map((c) => c.id)] } };
    }

    const variants = await prisma.productVariant.findMany({
      where: variantWhere,
      select: {
        id: true,
        inventory: { where: { locationId: input.locationId }, select: { quantity: true } },
      },
    });
    if (variants.length === 0) {
      throw badRequest('There are no active products matching this selection to count.');
    }

    const count = await withNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const number = await nextNumber(tx, 'stockCount');
        return tx.stockCount.create({
          data: {
            number,
            locationId: input.locationId,
            notes: input.notes ?? null,
            createdById: userId,
            status: StockCountStatus.IN_PROGRESS,
            items: {
              create: variants.map((variant) => ({
                variantId: variant.id,
                // Snapshot of what the system believed at the moment the sheet
                // was printed — differences are measured against this.
                systemQty: variant.inventory.reduce((sum, row) => sum + row.quantity, 0),
                countedQty: null,
                difference: 0,
              })),
            },
          },
          include: countInclude,
        });
      }),
    );

    await auditFromRequest(req, {
      action: 'stock_count.started',
      entity: 'StockCount',
      entityId: count.id,
      after: { number: count.number, location: location.name, lines: variants.length },
    });
    res.status(201).json({ data: count });
  }),
);

const saveCountSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: nonEmpty('Product variant'),
        countedQty: quantity('Counted quantity').nullable(),
        notes: optionalText(300),
      }),
    )
    .min(1, 'Enter at least one counted quantity.'),
});

stockCountsRouter.put(
  '/:id/items',
  requirePermission('inventory:count'),
  asyncHandler(async (req, res) => {
    const input = parse(saveCountSchema, req.body);
    const count = await prisma.stockCount.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!count) throw notFound('Stock count');
    if (count.status === StockCountStatus.COMPLETED) {
      throw conflict(`Count ${count.number} is finalised and can no longer be edited.`);
    }
    if (count.status === StockCountStatus.CANCELLED) {
      throw conflict(`Count ${count.number} was cancelled.`);
    }

    await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        const existing = count.items.find((row) => row.variantId === item.variantId);
        if (!existing) continue;
        await tx.stockCountItem.update({
          where: { id: existing.id },
          data: {
            countedQty: item.countedQty,
            difference: item.countedQty == null ? 0 : item.countedQty - existing.systemQty,
            notes: item.notes ?? null,
          },
        });
      }
      await tx.stockCount.update({
        where: { id: count.id },
        data: { status: StockCountStatus.IN_PROGRESS },
      });
    });

    const updated = await prisma.stockCount.findUniqueOrThrow({
      where: { id: count.id },
      include: countInclude,
    });
    res.json({ data: updated });
  }),
);

/**
 * Finalising a count turns every difference into a traceable stock movement.
 * Nothing is applied until this is called, and it can only be called once.
 */
stockCountsRouter.post(
  '/:id/finalize',
  requirePermission('inventory:count', 'inventory:adjust'),
  asyncHandler(async (req, res) => {
    const { confirm } = parse(z.object({ confirm: z.literal(true) }), req.body);
    void confirm;
    const userId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.stockCount.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!count) throw notFound('Stock count');
      if (count.status === StockCountStatus.COMPLETED) {
        throw conflict(`Count ${count.number} has already been finalised.`);
      }
      if (count.status === StockCountStatus.CANCELLED) {
        throw conflict(`Count ${count.number} was cancelled.`);
      }

      const counted = count.items.filter((item) => item.countedQty != null);
      if (counted.length === 0) {
        throw badRequest('Enter at least one physical count before finalising.');
      }

      const differences = counted.filter((item) => item.countedQty !== item.systemQty);
      for (const item of differences) {
        // Re-read live stock: the shelf may have moved since the sheet printed,
        // so the movement is calculated against the current figure.
        const live = await tx.inventory.findUnique({
          where: { variantId_locationId: { variantId: item.variantId, locationId: count.locationId } },
          select: { quantity: true },
        });
        const currentQty = live?.quantity ?? 0;
        const delta = item.countedQty! - currentQty;
        if (delta === 0) continue;

        await applyStockChange(tx, {
          variantId: item.variantId,
          locationId: count.locationId,
          delta,
          type: MovementType.STOCK_COUNT,
          userId,
          referenceType: 'StockCount',
          referenceId: count.id,
          referenceNumber: count.number,
          notes: `Physical count ${count.number}: system ${currentQty}, counted ${item.countedQty}`,
        });
      }

      const finalised = await tx.stockCount.update({
        where: { id: count.id },
        data: { status: StockCountStatus.COMPLETED, completedAt: new Date() },
        include: countInclude,
      });
      return { finalised, adjusted: differences.length, variantIds: differences.map((d) => d.variantId) };
    });

    await refreshStockAlerts(result.variantIds);
    await auditFromRequest(req, {
      action: 'stock_count.finalized',
      entity: 'StockCount',
      entityId: result.finalised.id,
      after: { number: result.finalised.number, adjustedLines: result.adjusted },
    });

    res.json({
      data: result.finalised,
      message:
        result.adjusted === 0
          ? 'Count finalised — the physical stock matched the system exactly.'
          : `Count finalised — ${result.adjusted} item(s) adjusted.`,
    });
  }),
);

stockCountsRouter.post(
  '/:id/cancel',
  requirePermission('inventory:count'),
  asyncHandler(async (req, res) => {
    const count = await prisma.stockCount.findUnique({ where: { id: req.params.id } });
    if (!count) throw notFound('Stock count');
    if (count.status === StockCountStatus.COMPLETED) {
      throw conflict(`Count ${count.number} is already finalised.`);
    }
    const cancelled = await prisma.stockCount.update({
      where: { id: count.id },
      data: { status: StockCountStatus.CANCELLED },
      include: countInclude,
    });
    await auditFromRequest(req, {
      action: 'stock_count.cancelled',
      entity: 'StockCount',
      entityId: count.id,
      after: { number: count.number },
    });
    res.json({ data: cancelled });
  }),
);
