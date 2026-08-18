import { MovementType, PaymentMethod, PaymentStatus, Prisma, SaleStatus } from '@prisma/client';
import { Router } from 'express';
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

export const salesRouter = Router();

const saleInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
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
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  },
} satisfies Prisma.SaleInclude;

const itemSchema = z.object({
  variantId: nonEmpty('Product variant'),
  quantity: positiveQuantity('Quantity'),
  unitPrice: money('Selling price'),
  discount: money('Discount').default(0),
  tax: money('Tax').default(0),
});

const saleInput = z
  .object({
    customerId: z.string().trim().min(1).nullish(),
    locationId: nonEmpty('Location'),
    saleDate: z.coerce.date().default(() => new Date()),
    status: z.enum([SaleStatus.DRAFT, SaleStatus.COMPLETED]).default(SaleStatus.COMPLETED),
    discount: money('Order discount').default(0),
    paidAmount: money('Amount received').default(0),
    paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
    notes: optionalText(2000),
    items: z.array(itemSchema).min(1, 'Add at least one product to this sale.'),
  })
  .superRefine((value, ctx) => {
    for (const [index, item] of value.items.entries()) {
      if (item.discount > item.unitPrice * item.quantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'discount'],
          message: 'The line discount cannot be greater than the line value.',
        });
      }
    }
  });

function computeTotals<
  T extends { quantity: number; unitPrice: number; discount: number; tax: number },
>(items: T[], orderDiscount: number) {
  const lines = items.map((item) => ({
    ...item,
    total: lineTotal({
      unit: item.unitPrice,
      quantity: item.quantity,
      discount: item.discount,
      tax: item.tax,
    }),
  }));
  const subtotal = sum(lines.map((line) => line.unitPrice * line.quantity));
  const discount = round2(sum(lines.map((line) => line.discount)) + orderDiscount);
  const tax = sum(lines.map((line) => line.tax));
  return { lines, subtotal, discount, tax, total: Math.max(0, round2(subtotal - discount + tax)) };
}

function paymentStatusFor(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return PaymentStatus.UNPAID;
  if (paid + 0.009 >= total) return PaymentStatus.PAID;
  return PaymentStatus.PARTIAL;
}

salesRouter.get(
  '/',
  requirePermission('sale:view'),
  asyncHandler(async (req, res) => {
    const query = parse(
      listQuery.extend({
        status: z.nativeEnum(SaleStatus).optional(),
        customerId: z.string().trim().optional(),
        locationId: z.string().trim().optional(),
        paymentMethod: z.nativeEnum(PaymentMethod).optional(),
        paymentStatus: z.nativeEnum(PaymentStatus).optional(),
      }),
      req.query,
    );
    const where: Prisma.SaleWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.from || query.to) {
      where.saleDate = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        ...paginate(query),
        orderBy: query.sortBy === 'total' ? { total: query.sortDir } : { saleDate: query.sortDir },
        include: {
          customer: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    res.json({
      data: sales.map((sale) => ({
        ...sale,
        subtotal: num(sale.subtotal),
        discount: num(sale.discount),
        tax: num(sale.tax),
        total: num(sale.total),
        paidAmount: num(sale.paidAmount),
      })),
      meta: pageMeta(total, query),
    });
  }),
);

salesRouter.get(
  '/:id',
  requirePermission('sale:view'),
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: saleInclude,
    });
    if (!sale) throw notFound('Sale');

    const [movements, returns] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { referenceType: 'Sale', referenceId: sale.id },
        orderBy: { createdAt: 'desc' },
        include: { variant: { select: { sku: true, product: { select: { name: true } } } } },
      }),
      prisma.return.findMany({
        where: { saleId: sale.id },
        include: { items: { include: { variant: { select: { sku: true } } } } },
      }),
    ]);

    const canSeeProfit = req.user!.role !== 'STAFF';
    const items = sale.items.map((item) => ({
      ...item,
      unitPrice: num(item.unitPrice),
      discount: num(item.discount),
      tax: num(item.tax),
      total: num(item.total),
      // Staff must not see cost or margin (spec §5).
      ...(canSeeProfit
        ? {
            unitCost: num(item.unitCost),
            profit: round2(num(item.total) - num(item.unitCost) * item.quantity),
          }
        : { unitCost: undefined, profit: undefined }),
    }));

    res.json({
      data: {
        ...sale,
        subtotal: num(sale.subtotal),
        discount: num(sale.discount),
        tax: num(sale.tax),
        total: num(sale.total),
        paidAmount: num(sale.paidAmount),
        items,
        movements,
        returns,
        ...(canSeeProfit
          ? {
              profit: round2(
                sale.items.reduce(
                  (acc, item) => acc + num(item.total) - num(item.unitCost) * item.quantity,
                  0,
                ),
              ),
            }
          : {}),
      },
    });
  }),
);

/** Issues stock for a completed sale. */
async function issueStock(tx: Prisma.TransactionClient, saleId: string, userId: string) {
  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId }, include: { items: true } });
  for (const item of sale.items) {
    // Rule 4 + the negative-stock guard in applyStockChange enforce
    // "a sale cannot exceed available stock".
    await applyStockChange(tx, {
      variantId: item.variantId,
      locationId: sale.locationId,
      delta: -item.quantity,
      type: MovementType.SALE,
      userId,
      referenceType: 'Sale',
      referenceId: sale.id,
      referenceNumber: sale.number,
      notes: `Sold on ${sale.number}`,
    });
  }
  return sale;
}

salesRouter.post(
  '/',
  requirePermission('sale:create'),
  asyncHandler(async (req, res) => {
    const input = parse(saleInput, req.body);
    const userId = req.user!.id;

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: input.items.map((item) => item.variantId) } },
      select: { id: true, costPrice: true, sku: true, product: { select: { name: true } } },
    });
    const missing = input.items.find((item) => !variants.some((v) => v.id === item.variantId));
    if (missing) throw badRequest('One or more of the selected products no longer exists.');

    const totals = computeTotals(input.items, input.discount);
    if (input.paidAmount > totals.total) {
      throw badRequest('The amount received cannot be more than the sale total.');
    }

    const sale = await withNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const number = await nextNumber(tx, 'sale', input.saleDate);
        const created = await tx.sale.create({
          data: {
            number,
            customerId: input.customerId ?? null,
            locationId: input.locationId,
            saleDate: input.saleDate,
            status: input.status,
            subtotal: toDecimal(totals.subtotal),
            discount: toDecimal(totals.discount),
            tax: toDecimal(totals.tax),
            total: toDecimal(totals.total),
            paidAmount: toDecimal(input.paidAmount),
            paymentMethod: input.paymentMethod,
            paymentStatus: paymentStatusFor(totals.total, input.paidAmount),
            notes: input.notes ?? null,
            createdById: userId,
            items: {
              create: totals.lines.map((line) => ({
                variantId: line.variantId,
                quantity: line.quantity,
                unitPrice: toDecimal(line.unitPrice),
                // Cost is frozen at sale time so later price changes cannot
                // rewrite historical profit.
                unitCost: variants.find((v) => v.id === line.variantId)!.costPrice,
                discount: toDecimal(line.discount),
                tax: toDecimal(line.tax),
                total: toDecimal(line.total),
              })),
            },
          },
        });

        if (input.status === SaleStatus.COMPLETED) {
          await issueStock(tx, created.id, userId);
        }

        return tx.sale.findUniqueOrThrow({ where: { id: created.id }, include: saleInclude });
      }),
    );

    if (input.status === SaleStatus.COMPLETED) {
      await refreshStockAlerts(input.items.map((item) => item.variantId));
    }
    await auditFromRequest(req, {
      action: 'sale.created',
      entity: 'Sale',
      entityId: sale.id,
      after: { number: sale.number, total: num(sale.total), status: sale.status },
    });

    res.status(201).json({ data: sale });
  }),
);

salesRouter.post(
  '/:id/complete',
  requirePermission('sale:create'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const sale = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!existing) throw notFound('Sale');
      if (existing.status === SaleStatus.COMPLETED) {
        throw conflict(`Sale ${existing.number} is already complete.`);
      }
      if (existing.status === SaleStatus.CANCELLED) {
        throw conflict(`Sale ${existing.number} was cancelled.`);
      }
      if (existing.items.length === 0) {
        throw badRequest('A sale cannot be completed without any items.');
      }

      await tx.sale.update({ where: { id: existing.id }, data: { status: SaleStatus.COMPLETED } });
      await issueStock(tx, existing.id, userId);
      return tx.sale.findUniqueOrThrow({ where: { id: existing.id }, include: saleInclude });
    });

    await refreshStockAlerts(sale.items.map((item) => item.variantId));
    await auditFromRequest(req, {
      action: 'sale.completed',
      entity: 'Sale',
      entityId: sale.id,
      after: { number: sale.number, total: num(sale.total) },
    });
    res.json({ data: sale });
  }),
);

const paymentSchema = z.object({
  paidAmount: money('Amount received'),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

salesRouter.post(
  '/:id/payment',
  requirePermission('sale:create'),
  asyncHandler(async (req, res) => {
    const input = parse(paymentSchema, req.body);
    const sale = await prisma.sale.findUnique({ where: { id: req.params.id } });
    if (!sale) throw notFound('Sale');
    if (input.paidAmount > num(sale.total)) {
      throw badRequest('The amount received cannot be more than the sale total.');
    }
    const updated = await prisma.sale.update({
      where: { id: sale.id },
      data: {
        paidAmount: toDecimal(input.paidAmount),
        paymentMethod: input.paymentMethod ?? sale.paymentMethod,
        paymentStatus: paymentStatusFor(num(sale.total), input.paidAmount),
      },
      include: saleInclude,
    });
    await auditFromRequest(req, {
      action: 'sale.payment_recorded',
      entity: 'Sale',
      entityId: sale.id,
      before: { paidAmount: num(sale.paidAmount) },
      after: { paidAmount: input.paidAmount },
    });
    res.json({ data: updated });
  }),
);

/** Cancelling a completed sale returns the goods to stock (rule 10). */
salesRouter.post(
  '/:id/cancel',
  requirePermission('sale:cancel'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!sale) throw notFound('Sale');
      if (sale.status === SaleStatus.CANCELLED) {
        throw conflict(`Sale ${sale.number} is already cancelled.`);
      }

      const returned = await tx.return.count({ where: { saleId: sale.id } });
      if (returned > 0) {
        throw conflict(
          `Sale ${sale.number} already has a return recorded against it. Reverse the return first.`,
        );
      }

      const variantIds: string[] = [];
      if (sale.status === SaleStatus.COMPLETED) {
        for (const item of sale.items) {
          await applyStockChange(tx, {
            variantId: item.variantId,
            locationId: sale.locationId,
            delta: item.quantity,
            type: MovementType.SALE_CANCELLED,
            userId,
            referenceType: 'Sale',
            referenceId: sale.id,
            referenceNumber: sale.number,
            notes: `Stock returned — sale ${sale.number} cancelled`,
          });
          variantIds.push(item.variantId);
        }
      }

      const cancelled = await tx.sale.update({
        where: { id: sale.id },
        data: { status: SaleStatus.CANCELLED, cancelledAt: new Date() },
        include: saleInclude,
      });
      return { cancelled, variantIds };
    });

    await refreshStockAlerts(result.variantIds);
    await auditFromRequest(req, {
      action: 'sale.cancelled',
      entity: 'Sale',
      entityId: result.cancelled.id,
      after: { number: result.cancelled.number, restockedLines: result.variantIds.length },
    });

    res.json({
      data: result.cancelled,
      message:
        result.variantIds.length > 0
          ? `Sale cancelled and ${result.variantIds.length} item(s) returned to stock.`
          : 'Sale cancelled.',
    });
  }),
);
