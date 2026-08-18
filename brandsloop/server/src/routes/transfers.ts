import { Router } from 'express';
import { MovementType, Prisma, TransferStatus } from '@prisma/client';
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
  positiveQuantity,
} from '../lib/validate.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { applyStockChange } from '../services/inventory.js';
import { nextNumber, withNumberRetry } from '../services/numbering.js';
import { auditFromRequest } from '../services/audit.js';
import { refreshStockAlerts } from '../services/notifications.js';

export const transfersRouter = Router();

const transferInput = z
  .object({
    fromLocationId: nonEmpty('Source location'),
    toLocationId: nonEmpty('Destination location'),
    notes: optionalText(1000),
    /** When true the stock moves immediately instead of sitting as a draft. */
    complete: z.coerce.boolean().default(true),
    items: z
      .array(
        z.object({
          variantId: nonEmpty('Product variant'),
          quantity: positiveQuantity('Transfer quantity'),
        }),
      )
      .min(1, 'Add at least one product to transfer.'),
  })
  .superRefine((value, ctx) => {
    if (value.fromLocationId === value.toLocationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['toLocationId'],
        message: 'The source and destination locations must be different.',
      });
    }
  });

const transferInclude = {
  fromLocation: { select: { id: true, name: true, code: true } },
  toLocation: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    include: {
      variant: {
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          product: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.StockTransferInclude;

transfersRouter.get(
  '/',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const query = parse(
      listQuery.extend({
        status: z.nativeEnum(TransferStatus).optional(),
        locationId: z.string().trim().optional(),
      }),
      req.query,
    );
    const where: Prisma.StockTransferWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.locationId) {
      where.OR = [{ fromLocationId: query.locationId }, { toLocationId: query.locationId }];
    }
    if (query.from || query.to) {
      where.transferDate = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) where.number = { contains: query.search, mode: 'insensitive' };

    const [total, transfers] = await Promise.all([
      prisma.stockTransfer.count({ where }),
      prisma.stockTransfer.findMany({
        where,
        ...paginate(query),
        orderBy: { transferDate: query.sortDir },
        include: transferInclude,
      }),
    ]);
    res.json({ data: transfers, meta: pageMeta(total, query) });
  }),
);

transfersRouter.get(
  '/:id',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: req.params.id },
      include: transferInclude,
    });
    if (!transfer) throw notFound('Stock transfer');
    res.json({ data: transfer });
  }),
);

/** Moves the stock and writes the paired OUT / IN movement records. */
async function completeTransfer(transferId: string, userId: string) {
  return withNumberRetry(() =>
    prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });
      if (!transfer) throw notFound('Stock transfer');
      if (transfer.status === TransferStatus.COMPLETED) {
        throw conflict(`Transfer ${transfer.number} has already been completed.`);
      }
      if (transfer.status === TransferStatus.CANCELLED) {
        throw conflict(`Transfer ${transfer.number} was cancelled and cannot be completed.`);
      }

      for (const item of transfer.items) {
        // Rule 8: one movement out of the source, one into the destination.
        await applyStockChange(tx, {
          variantId: item.variantId,
          locationId: transfer.fromLocationId,
          delta: -item.quantity,
          type: MovementType.TRANSFER_OUT,
          userId,
          referenceType: 'StockTransfer',
          referenceId: transfer.id,
          referenceNumber: transfer.number,
        });
        await applyStockChange(tx, {
          variantId: item.variantId,
          locationId: transfer.toLocationId,
          delta: item.quantity,
          type: MovementType.TRANSFER_IN,
          userId,
          referenceType: 'StockTransfer',
          referenceId: transfer.id,
          referenceNumber: transfer.number,
        });
      }

      return tx.stockTransfer.update({
        where: { id: transfer.id },
        data: { status: TransferStatus.COMPLETED, completedAt: new Date() },
        include: transferInclude,
      });
    }),
  );
}

transfersRouter.post(
  '/',
  requirePermission('inventory:transfer'),
  asyncHandler(async (req, res) => {
    const input = parse(transferInput, req.body);
    const userId = req.user!.id;

    const merged = new Map<string, number>();
    for (const item of input.items) {
      merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
    }

    const draft = await withNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const number = await nextNumber(tx, 'stockTransfer');
        return tx.stockTransfer.create({
          data: {
            number,
            fromLocationId: input.fromLocationId,
            toLocationId: input.toLocationId,
            notes: input.notes ?? null,
            createdById: userId,
            status: TransferStatus.DRAFT,
            items: {
              create: [...merged].map(([variantId, quantity]) => ({ variantId, quantity })),
            },
          },
          include: transferInclude,
        });
      }),
    );

    const transfer = input.complete ? await completeTransfer(draft.id, userId) : draft;

    if (input.complete) await refreshStockAlerts([...merged.keys()]);
    await auditFromRequest(req, {
      action: input.complete ? 'stock.transferred' : 'stock.transfer_drafted',
      entity: 'StockTransfer',
      entityId: transfer.id,
      after: {
        number: transfer.number,
        from: transfer.fromLocationId,
        to: transfer.toLocationId,
        items: [...merged].map(([variantId, quantity]) => ({ variantId, quantity })),
      },
    });

    res.status(201).json({ data: transfer });
  }),
);

transfersRouter.post(
  '/:id/complete',
  requirePermission('inventory:transfer'),
  asyncHandler(async (req, res) => {
    const transfer = await completeTransfer(req.params.id, req.user!.id);
    await refreshStockAlerts(transfer.items.map((item) => item.variantId));
    await auditFromRequest(req, {
      action: 'stock.transferred',
      entity: 'StockTransfer',
      entityId: transfer.id,
      after: { number: transfer.number, status: transfer.status },
    });
    res.json({ data: transfer });
  }),
);

transfersRouter.post(
  '/:id/cancel',
  requirePermission('inventory:transfer'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Stock transfer');
    if (existing.status === TransferStatus.COMPLETED) {
      throw badRequest(
        `Transfer ${existing.number} is already complete. Create a transfer in the opposite direction to move the stock back.`,
      );
    }
    const transfer = await prisma.stockTransfer.update({
      where: { id: existing.id },
      data: { status: TransferStatus.CANCELLED },
      include: transferInclude,
    });
    await auditFromRequest(req, {
      action: 'stock.transfer_cancelled',
      entity: 'StockTransfer',
      entityId: transfer.id,
      before: { status: existing.status },
      after: { status: transfer.status },
    });
    res.json({ data: transfer });
  }),
);
