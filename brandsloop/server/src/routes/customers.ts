import { Router } from 'express';
import { PartyStatus, Prisma, SaleStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { listQuery, nonEmpty, optionalText, orderBy, pageMeta, paginate, parse } from '../lib/validate.js';
import { conflict, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { auditFromRequest } from '../services/audit.js';
import { num, round2 } from '../lib/money.js';

export const customersRouter = Router();

const customerInput = z.object({
  name: nonEmpty('Customer name', 120),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .max(160)
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  address: optionalText(300),
  city: optionalText(80),
  notes: optionalText(2000),
  status: z.nativeEnum(PartyStatus).default(PartyStatus.ACTIVE),
});

customersRouter.get(
  '/',
  requirePermission('customer:view'),
  asyncHandler(async (req, res) => {
    const query = parse(listQuery, req.query);
    const where: Prisma.CustomerWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        ...paginate(query),
        orderBy: orderBy(query.sortBy, query.sortDir, { name: 'name', createdAt: 'createdAt' }, 'name'),
        include: { _count: { select: { sales: true, returns: true } } },
      }),
    ]);

    const ids = customers.map((c) => c.id);
    const spend = ids.length
      ? await prisma.sale.groupBy({
          by: ['customerId'],
          where: { customerId: { in: ids }, status: SaleStatus.COMPLETED },
          _sum: { total: true },
        })
      : [];

    res.json({
      data: customers.map((customer) => ({
        ...customer,
        totalSpent: round2(num(spend.find((s) => s.customerId === customer.id)?._sum.total)),
      })),
      meta: pageMeta(total, query),
    });
  }),
);

customersRouter.get(
  '/:id',
  requirePermission('customer:view'),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) throw notFound('Customer');

    const [sales, returns, totals] = await Promise.all([
      prisma.sale.findMany({
        where: { customerId: customer.id },
        orderBy: { saleDate: 'desc' },
        take: 50,
        include: { _count: { select: { items: true } }, location: { select: { name: true } } },
      }),
      prisma.return.findMany({
        where: { customerId: customer.id },
        orderBy: { returnDate: 'desc' },
        take: 25,
        include: { items: { include: { variant: { select: { sku: true } } } } },
      }),
      prisma.sale.aggregate({
        where: { customerId: customer.id, status: SaleStatus.COMPLETED },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    res.json({
      data: {
        ...customer,
        stats: {
          purchaseCount: totals._count,
          totalSpent: round2(num(totals._sum.total)),
          returnCount: returns.length,
        },
        sales: sales.map((s) => ({ ...s, total: num(s.total) })),
        returns,
      },
    });
  }),
);

customersRouter.post(
  '/',
  requirePermission('customer:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(customerInput, req.body);
    const customer = await prisma.customer.create({ data: input });
    await auditFromRequest(req, {
      action: 'customer.created',
      entity: 'Customer',
      entityId: customer.id,
      after: customer,
    });
    res.status(201).json({ data: customer });
  }),
);

customersRouter.put(
  '/:id',
  requirePermission('customer:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(customerInput.partial(), req.body);
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: input });
    await auditFromRequest(req, {
      action: 'customer.updated',
      entity: 'Customer',
      entityId: customer.id,
      after: customer,
    });
    res.json({ data: customer });
  }),
);

customersRouter.delete(
  '/:id',
  requirePermission('customer:manage'),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { sales: true } } },
    });
    if (!customer) throw notFound('Customer');
    if (customer._count.sales > 0) {
      throw conflict(
        `${customer.name} has ${customer._count.sales} sale(s) on record. Mark them inactive instead.`,
      );
    }
    await prisma.customer.delete({ where: { id: customer.id } });
    await auditFromRequest(req, {
      action: 'customer.deleted',
      entity: 'Customer',
      entityId: customer.id,
      before: customer,
    });
    res.json({ ok: true });
  }),
);
