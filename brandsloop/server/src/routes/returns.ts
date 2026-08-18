import { MovementType, Prisma, ReturnCondition, ReturnType, SaleStatus } from '@prisma/client';
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
import { badRequest, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { applyStockChange } from '../services/inventory.js';
import { nextNumber, withNumberRetry } from '../services/numbering.js';
import { auditFromRequest } from '../services/audit.js';
import { refreshStockAlerts } from '../services/notifications.js';
import { num, round2, sum, toDecimal } from '../lib/money.js';

export const returnsRouter = Router();

const returnInclude = {
  sale: { select: { id: true, number: true, saleDate: true } },
  purchase: { select: { id: true, number: true, orderDate: true } },
  customer: { select: { id: true, name: true, phone: true } },
  supplier: { select: { id: true, name: true, phone: true } },
  location: { select: { id: true, name: true } },
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
} satisfies Prisma.ReturnInclude;

const returnInput = z
  .object({
    type: z.nativeEnum(ReturnType),
    saleId: z.string().trim().min(1).nullish(),
    purchaseId: z.string().trim().min(1).nullish(),
    customerId: z.string().trim().min(1).nullish(),
    supplierId: z.string().trim().min(1).nullish(),
    locationId: nonEmpty('Location'),
    returnDate: z.coerce.date().default(() => new Date()),
    reason: optionalText(500),
    notes: optionalText(2000),
    items: z
      .array(
        z.object({
          variantId: nonEmpty('Product variant'),
          quantity: positiveQuantity('Return quantity'),
          condition: z.nativeEnum(ReturnCondition).default(ReturnCondition.RESELLABLE),
          unitPrice: money('Unit price').default(0),
          reason: optionalText(300),
        }),
      )
      .min(1, 'Add at least one product to this return.'),
  })
  .superRefine((value, ctx) => {
    if (value.type === ReturnType.SUPPLIER && !value.supplierId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supplierId'],
        message: 'Choose the supplier the goods are going back to.',
      });
    }
    if (value.type === ReturnType.SUPPLIER) {
      const damaged = value.items.find((item) => item.condition === ReturnCondition.DAMAGED);
      if (damaged) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message:
            'Supplier returns always take goods out of stock — the resellable/damaged choice only applies to customer returns.',
        });
      }
    }
  });

returnsRouter.get(
  '/',
  requirePermission('return:view'),
  asyncHandler(async (req, res) => {
    const query = parse(
      listQuery.extend({
        type: z.nativeEnum(ReturnType).optional(),
        locationId: z.string().trim().optional(),
        condition: z.nativeEnum(ReturnCondition).optional(),
      }),
      req.query,
    );
    const where: Prisma.ReturnWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.locationId) where.locationId = query.locationId;
    if (query.condition) where.items = { some: { condition: query.condition } };
    if (query.from || query.to) {
      where.returnDate = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
        { sale: { number: { contains: query.search, mode: 'insensitive' } } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, returns] = await Promise.all([
      prisma.return.count({ where }),
      prisma.return.findMany({
        where,
        ...paginate(query),
        orderBy: { returnDate: query.sortDir },
        include: returnInclude,
      }),
    ]);

    res.json({
      data: returns.map((row) => ({ ...row, refundAmount: num(row.refundAmount) })),
      meta: pageMeta(total, query),
    });
  }),
);

returnsRouter.get(
  '/:id',
  requirePermission('return:view'),
  asyncHandler(async (req, res) => {
    const record = await prisma.return.findUnique({
      where: { id: req.params.id },
      include: returnInclude,
    });
    if (!record) throw notFound('Return');
    const movements = await prisma.stockMovement.findMany({
      where: { referenceType: 'Return', referenceId: record.id },
      include: { variant: { select: { sku: true, product: { select: { name: true } } } } },
    });
    res.json({ data: { ...record, refundAmount: num(record.refundAmount), movements } });
  }),
);

returnsRouter.post(
  '/',
  requirePermission('return:create'),
  asyncHandler(async (req, res) => {
    const input = parse(returnInput, req.body);
    const userId = req.user!.id;

    // A customer return referencing a sale can never exceed what was sold,
    // minus anything already returned against it.
    if (input.type === ReturnType.CUSTOMER && input.saleId) {
      const sale = await prisma.sale.findUnique({
        where: { id: input.saleId },
        include: { items: true },
      });
      if (!sale) throw notFound('Sale');
      if (sale.status !== SaleStatus.COMPLETED) {
        throw badRequest(`Sale ${sale.number} is not completed, so it has nothing to return.`);
      }
      const alreadyReturned = await prisma.returnItem.groupBy({
        by: ['variantId'],
        where: { return: { saleId: sale.id } },
        _sum: { quantity: true },
      });
      for (const item of input.items) {
        const sold = sale.items
          .filter((line) => line.variantId === item.variantId)
          .reduce((acc, line) => acc + line.quantity, 0);
        if (sold === 0) {
          throw badRequest(`One of the items was not part of sale ${sale.number}.`);
        }
        const returned = alreadyReturned.find((r) => r.variantId === item.variantId)?._sum.quantity ?? 0;
        if (item.quantity + returned > sold) {
          throw badRequest(
            `You can return at most ${sold - returned} of that item against sale ${sale.number}.`,
          );
        }
      }
    }

    const refundAmount = round2(
      sum(input.items.map((item) => item.unitPrice * item.quantity)),
    );

    const created = await withNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const number = await nextNumber(tx, 'return', input.returnDate);
        const record = await tx.return.create({
          data: {
            number,
            type: input.type,
            saleId: input.saleId ?? null,
            purchaseId: input.purchaseId ?? null,
            customerId: input.customerId ?? null,
            supplierId: input.supplierId ?? null,
            locationId: input.locationId,
            returnDate: input.returnDate,
            reason: input.reason ?? null,
            notes: input.notes ?? null,
            refundAmount: toDecimal(refundAmount),
            createdById: userId,
            items: {
              create: input.items.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
                condition:
                  input.type === ReturnType.SUPPLIER ? ReturnCondition.RESELLABLE : item.condition,
                unitPrice: toDecimal(item.unitPrice),
                reason: item.reason ?? null,
              })),
            },
          },
        });

        for (const item of input.items) {
          if (input.type === ReturnType.SUPPLIER) {
            // Rule 7: goods going back to the supplier leave stock.
            await applyStockChange(tx, {
              variantId: item.variantId,
              locationId: input.locationId,
              delta: -item.quantity,
              type: MovementType.SUPPLIER_RETURN,
              userId,
              referenceType: 'Return',
              referenceId: record.id,
              referenceNumber: number,
              notes: item.reason ?? input.reason ?? 'Returned to supplier',
            });
            continue;
          }

          // Rules 5 & 6: resellable goods rejoin stock, damaged goods are
          // recorded as damaged and stay out of sellable inventory.
          const damaged = item.condition === ReturnCondition.DAMAGED;
          await applyStockChange(tx, {
            variantId: item.variantId,
            locationId: input.locationId,
            delta: item.quantity,
            type: damaged ? MovementType.DAMAGED : MovementType.CUSTOMER_RETURN,
            userId,
            referenceType: 'Return',
            referenceId: record.id,
            referenceNumber: number,
            notes: damaged
              ? `Damaged return — not added to sellable stock${item.reason ? ` (${item.reason})` : ''}`
              : (item.reason ?? input.reason ?? 'Customer return'),
            toDamaged: damaged,
          });
        }

        return tx.return.findUniqueOrThrow({ where: { id: record.id }, include: returnInclude });
      }),
    );

    await refreshStockAlerts(input.items.map((item) => item.variantId));
    await auditFromRequest(req, {
      action: input.type === ReturnType.CUSTOMER ? 'return.customer_created' : 'return.supplier_created',
      entity: 'Return',
      entityId: created.id,
      after: {
        number: created.number,
        type: created.type,
        refundAmount,
        items: input.items.map((i) => ({ variantId: i.variantId, qty: i.quantity, condition: i.condition })),
      },
    });

    res.status(201).json({ data: { ...created, refundAmount } });
  }),
);
