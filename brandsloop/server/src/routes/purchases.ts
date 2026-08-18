import { Router } from 'express';
import { MovementType, PaymentStatus, Prisma, PurchaseStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import {
  listQuery,
  money,
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
import { lineTotal, num, round2, sum, toDecimal } from '../lib/money.js';

export const purchasesRouter = Router();

const purchaseInclude = {
  supplier: { select: { id: true, name: true, phone: true, email: true } },
  location: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    include: {
      variant: {
        select: {
          id: true,
          sku: true,
          barcode: true,
          size: true,
          color: true,
          costPrice: true,
          product: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.PurchaseInclude;

const itemSchema = z.object({
  variantId: nonEmpty('Product variant'),
  quantity: positiveQuantity('Quantity'),
  unitCost: money('Unit cost'),
  discount: money('Discount').default(0),
  tax: money('Tax').default(0),
});

const purchaseInput = z
  .object({
    supplierId: nonEmpty('Supplier'),
    locationId: nonEmpty('Location'),
    orderDate: z.coerce.date().default(() => new Date()),
    expectedDate: z.coerce.date().optional().nullable(),
    status: z
      .enum([PurchaseStatus.DRAFT, PurchaseStatus.ORDERED, PurchaseStatus.RECEIVED])
      .default(PurchaseStatus.ORDERED),
    discount: money('Order discount').default(0),
    paidAmount: money('Paid amount').default(0),
    notes: optionalText(2000),
    items: z.array(itemSchema).min(1, 'Add at least one product to this purchase.'),
  })
  .superRefine((value, ctx) => {
    for (const [index, item] of value.items.entries()) {
      if (item.discount > item.unitCost * item.quantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'discount'],
          message: 'The line discount cannot be greater than the line value.',
        });
      }
    }
  });

function computeTotals<T extends { quantity: number; unitCost: number; discount: number; tax: number }>(
  items: T[],
  orderDiscount: number,
) {
  const lines = items.map((item) => ({
    ...item,
    total: lineTotal({
      unit: item.unitCost,
      quantity: item.quantity,
      discount: item.discount,
      tax: item.tax,
    }),
  }));
  const subtotal = sum(lines.map((line) => line.unitCost * line.quantity));
  const lineDiscounts = sum(lines.map((line) => line.discount));
  const tax = sum(lines.map((line) => line.tax));
  const discount = round2(lineDiscounts + orderDiscount);
  const total = round2(subtotal - discount + tax);
  return { lines, subtotal, discount, tax, total: Math.max(0, total) };
}

function paymentStatusFor(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return PaymentStatus.UNPAID;
  if (paid + 0.009 >= total) return PaymentStatus.PAID;
  return PaymentStatus.PARTIAL;
}

purchasesRouter.get(
  '/',
  requirePermission('purchase:view'),
  asyncHandler(async (req, res) => {
    const query = parse(
      listQuery.extend({
        status: z.nativeEnum(PurchaseStatus).optional(),
        supplierId: z.string().trim().optional(),
        locationId: z.string().trim().optional(),
        paymentStatus: z.nativeEnum(PaymentStatus).optional(),
      }),
      req.query,
    );
    const where: Prisma.PurchaseWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.from || query.to) {
      where.orderDate = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, purchases] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        ...paginate(query),
        orderBy: query.sortBy === 'total' ? { total: query.sortDir } : { orderDate: query.sortDir },
        include: {
          supplier: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    res.json({
      data: purchases.map((purchase) => ({
        ...purchase,
        subtotal: num(purchase.subtotal),
        discount: num(purchase.discount),
        tax: num(purchase.tax),
        total: num(purchase.total),
        paidAmount: num(purchase.paidAmount),
      })),
      meta: pageMeta(total, query),
    });
  }),
);

purchasesRouter.get(
  '/:id',
  requirePermission('purchase:view'),
  asyncHandler(async (req, res) => {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: purchaseInclude,
    });
    if (!purchase) throw notFound('Purchase');

    const movements = await prisma.stockMovement.findMany({
      where: { referenceType: 'Purchase', referenceId: purchase.id },
      orderBy: { createdAt: 'desc' },
      include: {
        variant: { select: { sku: true, product: { select: { name: true } } } },
        user: { select: { name: true } },
      },
    });

    res.json({
      data: {
        ...purchase,
        subtotal: num(purchase.subtotal),
        discount: num(purchase.discount),
        tax: num(purchase.tax),
        total: num(purchase.total),
        paidAmount: num(purchase.paidAmount),
        items: purchase.items.map((item) => ({
          ...item,
          unitCost: num(item.unitCost),
          discount: num(item.discount),
          tax: num(item.tax),
          total: num(item.total),
        })),
        movements,
      },
    });
  }),
);

/** Receives quantities into stock and keeps the purchase status in step. */
async function receiveItems(
  purchaseId: string,
  userId: string,
  receipts: { itemId: string; quantity: number }[] | 'all',
) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });
    if (!purchase) throw notFound('Purchase');
    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw conflict(`Purchase ${purchase.number} was cancelled and cannot be received.`);
    }
    if (purchase.status === PurchaseStatus.RECEIVED) {
      throw conflict(`Purchase ${purchase.number} has already been fully received.`);
    }

    const plan =
      receipts === 'all'
        ? purchase.items
            .map((item) => ({ itemId: item.id, quantity: item.quantity - item.receivedQty }))
            .filter((line) => line.quantity > 0)
        : receipts;

    if (plan.length === 0) throw badRequest('There is nothing left to receive on this purchase.');

    const variantIds: string[] = [];
    for (const line of plan) {
      const item = purchase.items.find((row) => row.id === line.itemId);
      if (!item) throw badRequest('One of the lines does not belong to this purchase.');
      const outstanding = item.quantity - item.receivedQty;
      if (line.quantity <= 0) continue;
      if (line.quantity > outstanding) {
        throw badRequest(
          `You cannot receive ${line.quantity} units — only ${outstanding} are outstanding on that line.`,
        );
      }

      // Rule 3: receiving increases stock, always through a movement record.
      await applyStockChange(tx, {
        variantId: item.variantId,
        locationId: purchase.locationId,
        delta: line.quantity,
        type: MovementType.PURCHASE,
        userId,
        referenceType: 'Purchase',
        referenceId: purchase.id,
        referenceNumber: purchase.number,
        notes: `Received against ${purchase.number}`,
      });

      await tx.purchaseItem.update({
        where: { id: item.id },
        data: { receivedQty: { increment: line.quantity } },
      });
      variantIds.push(item.variantId);

      // Keep the variant's cost price aligned with what was actually paid, so
      // valuation and profit reporting follow the latest landed cost.
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { costPrice: item.unitCost },
      });
    }

    const refreshed = await tx.purchaseItem.findMany({ where: { purchaseId: purchase.id } });
    const fullyReceived = refreshed.every((item) => item.receivedQty >= item.quantity);
    const anyReceived = refreshed.some((item) => item.receivedQty > 0);

    const updated = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: fullyReceived
          ? PurchaseStatus.RECEIVED
          : anyReceived
            ? PurchaseStatus.PARTIALLY_RECEIVED
            : purchase.status,
        receivedDate: fullyReceived ? new Date() : purchase.receivedDate,
      },
      include: purchaseInclude,
    });

    return { purchase: updated, variantIds };
  });
}

purchasesRouter.post(
  '/',
  requirePermission('purchase:create'),
  asyncHandler(async (req, res) => {
    const input = parse(purchaseInput, req.body);
    const userId = req.user!.id;

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: input.items.map((item) => item.variantId) } },
      select: { id: true },
    });
    if (variants.length !== new Set(input.items.map((i) => i.variantId)).size) {
      throw badRequest('One or more of the selected products no longer exists.');
    }

    const totals = computeTotals(input.items, input.discount);
    if (input.paidAmount > totals.total) {
      throw badRequest('The amount paid cannot be more than the purchase total.');
    }

    const created = await withNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const number = await nextNumber(tx, 'purchase', input.orderDate);
        return tx.purchase.create({
          data: {
            number,
            supplierId: input.supplierId,
            locationId: input.locationId,
            orderDate: input.orderDate,
            expectedDate: input.expectedDate ?? null,
            status: input.status === PurchaseStatus.RECEIVED ? PurchaseStatus.ORDERED : input.status,
            subtotal: toDecimal(totals.subtotal),
            discount: toDecimal(totals.discount),
            tax: toDecimal(totals.tax),
            total: toDecimal(totals.total),
            paidAmount: toDecimal(input.paidAmount),
            paymentStatus: paymentStatusFor(totals.total, input.paidAmount),
            notes: input.notes ?? null,
            createdById: userId,
            items: {
              create: totals.lines.map((line) => ({
                variantId: line.variantId,
                quantity: line.quantity,
                unitCost: toDecimal(line.unitCost),
                discount: toDecimal(line.discount),
                tax: toDecimal(line.tax),
                total: toDecimal(line.total),
              })),
            },
          },
          include: purchaseInclude,
        });
      }),
    );

    // "Save and receive" in one step: the caller asked for RECEIVED up front.
    const result =
      input.status === PurchaseStatus.RECEIVED
        ? await receiveItems(created.id, userId, 'all')
        : { purchase: created, variantIds: [] as string[] };

    if (result.variantIds.length > 0) await refreshStockAlerts(result.variantIds);
    await auditFromRequest(req, {
      action: input.status === PurchaseStatus.RECEIVED ? 'purchase.received' : 'purchase.created',
      entity: 'Purchase',
      entityId: created.id,
      after: { number: created.number, total: num(created.total), status: result.purchase.status },
    });

    res.status(201).json({ data: result.purchase });
  }),
);

purchasesRouter.put(
  '/:id',
  requirePermission('purchase:create'),
  asyncHandler(async (req, res) => {
    const input = parse(purchaseInput, req.body);
    const before = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!before) throw notFound('Purchase');
    if (before.status !== PurchaseStatus.DRAFT && before.status !== PurchaseStatus.ORDERED) {
      throw conflict(
        `Purchase ${before.number} has stock received against it and can no longer be edited. Cancel it and raise a new order instead.`,
      );
    }

    const totals = computeTotals(input.items, input.discount);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: before.id } });
      return tx.purchase.update({
        where: { id: before.id },
        data: {
          supplierId: input.supplierId,
          locationId: input.locationId,
          orderDate: input.orderDate,
          expectedDate: input.expectedDate ?? null,
          status: input.status === PurchaseStatus.RECEIVED ? before.status : input.status,
          subtotal: toDecimal(totals.subtotal),
          discount: toDecimal(totals.discount),
          tax: toDecimal(totals.tax),
          total: toDecimal(totals.total),
          paidAmount: toDecimal(input.paidAmount),
          paymentStatus: paymentStatusFor(totals.total, input.paidAmount),
          notes: input.notes ?? null,
          items: {
            create: totals.lines.map((line) => ({
              variantId: line.variantId,
              quantity: line.quantity,
              unitCost: toDecimal(line.unitCost),
              discount: toDecimal(line.discount),
              tax: toDecimal(line.tax),
              total: toDecimal(line.total),
            })),
          },
        },
        include: purchaseInclude,
      });
    });

    await auditFromRequest(req, {
      action: 'purchase.updated',
      entity: 'Purchase',
      entityId: updated.id,
      before: { total: num(before.total), status: before.status },
      after: { total: num(updated.total), status: updated.status },
    });
    res.json({ data: updated });
  }),
);

const receiveSchema = z.object({
  receiveAll: z.coerce.boolean().default(false),
  items: z
    .array(z.object({ itemId: nonEmpty('Line'), quantity: positiveQuantity('Received quantity') }))
    .optional(),
});

purchasesRouter.post(
  '/:id/receive',
  requirePermission('purchase:receive'),
  asyncHandler(async (req, res) => {
    const input = parse(receiveSchema, req.body);
    if (!input.receiveAll && (!input.items || input.items.length === 0)) {
      throw badRequest('Choose which quantities you are receiving.');
    }

    const result = await receiveItems(
      req.params.id,
      req.user!.id,
      input.receiveAll ? 'all' : input.items!,
    );

    await refreshStockAlerts(result.variantIds);
    await auditFromRequest(req, {
      action: 'purchase.received',
      entity: 'Purchase',
      entityId: result.purchase.id,
      after: { number: result.purchase.number, status: result.purchase.status },
    });

    res.json({
      data: result.purchase,
      message:
        result.purchase.status === PurchaseStatus.RECEIVED
          ? `Purchase ${result.purchase.number} received in full and added to stock.`
          : `Stock received against ${result.purchase.number}. Some lines are still outstanding.`,
    });
  }),
);

const paymentSchema = z.object({ paidAmount: money('Paid amount') });

purchasesRouter.post(
  '/:id/payment',
  requirePermission('purchase:create'),
  asyncHandler(async (req, res) => {
    const input = parse(paymentSchema, req.body);
    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!purchase) throw notFound('Purchase');
    if (input.paidAmount > num(purchase.total)) {
      throw badRequest('The amount paid cannot be more than the purchase total.');
    }
    const updated = await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        paidAmount: toDecimal(input.paidAmount),
        paymentStatus: paymentStatusFor(num(purchase.total), input.paidAmount),
      },
      include: purchaseInclude,
    });
    await auditFromRequest(req, {
      action: 'purchase.payment_recorded',
      entity: 'Purchase',
      entityId: purchase.id,
      before: { paidAmount: num(purchase.paidAmount) },
      after: { paidAmount: input.paidAmount },
    });
    res.json({ data: updated });
  }),
);

/**
 * Cancelling reverses anything already received rather than deleting the
 * document, so the purchase and its stock history stay auditable (rule 10).
 */
purchasesRouter.post(
  '/:id/cancel',
  requirePermission('purchase:cancel'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!purchase) throw notFound('Purchase');
      if (purchase.status === PurchaseStatus.CANCELLED) {
        throw conflict(`Purchase ${purchase.number} is already cancelled.`);
      }

      const variantIds: string[] = [];
      for (const item of purchase.items) {
        if (item.receivedQty <= 0) continue;
        await applyStockChange(tx, {
          variantId: item.variantId,
          locationId: purchase.locationId,
          delta: -item.receivedQty,
          type: MovementType.PURCHASE_CANCELLED,
          userId,
          referenceType: 'Purchase',
          referenceId: purchase.id,
          referenceNumber: purchase.number,
          notes: `Reversal of received stock — purchase ${purchase.number} cancelled`,
        });
        await tx.purchaseItem.update({ where: { id: item.id }, data: { receivedQty: 0 } });
        variantIds.push(item.variantId);
      }

      const cancelled = await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: PurchaseStatus.CANCELLED },
        include: purchaseInclude,
      });
      return { cancelled, variantIds };
    });

    await refreshStockAlerts(result.variantIds);
    await auditFromRequest(req, {
      action: 'purchase.cancelled',
      entity: 'Purchase',
      entityId: result.cancelled.id,
      after: { number: result.cancelled.number, reversedLines: result.variantIds.length },
    });

    res.json({
      data: result.cancelled,
      message:
        result.variantIds.length > 0
          ? `Purchase cancelled and ${result.variantIds.length} received line(s) removed from stock.`
          : 'Purchase cancelled.',
    });
  }),
);
