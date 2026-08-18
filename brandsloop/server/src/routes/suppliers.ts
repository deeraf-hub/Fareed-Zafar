import { Router } from 'express';
import { PartyStatus, Prisma, PurchaseStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { listQuery, nonEmpty, optionalText, orderBy, pageMeta, paginate, parse } from '../lib/validate.js';
import { conflict, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { auditFromRequest } from '../services/audit.js';
import { num, round2 } from '../lib/money.js';

export const suppliersRouter = Router();

const supplierInput = z.object({
  name: nonEmpty('Supplier name', 120),
  contactPerson: optionalText(120),
  phone: optionalText(40),
  email: z.string().trim().email('Please enter a valid email address.').max(160).optional().nullable().or(z.literal('').transform(() => null)),
  address: optionalText(300),
  city: optionalText(80),
  taxNumber: optionalText(60),
  notes: optionalText(2000),
  status: z.nativeEnum(PartyStatus).default(PartyStatus.ACTIVE),
});

suppliersRouter.get(
  '/',
  requirePermission('supplier:view'),
  asyncHandler(async (req, res) => {
    const query = parse(listQuery.extend({ status: z.nativeEnum(PartyStatus).optional() }), req.query);
    const where: Prisma.SupplierWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        ...paginate(query),
        orderBy: orderBy(query.sortBy, query.sortDir, { name: 'name', createdAt: 'createdAt' }, 'name'),
        include: { _count: { select: { products: true, purchases: true } } },
      }),
    ]);

    const ids = suppliers.map((s) => s.id);
    const totals = ids.length
      ? await prisma.purchase.groupBy({
          by: ['supplierId'],
          where: { supplierId: { in: ids }, status: { not: PurchaseStatus.CANCELLED } },
          _sum: { total: true, paidAmount: true },
        })
      : [];

    res.json({
      data: suppliers.map((supplier) => {
        const totalsRow = totals.find((t) => t.supplierId === supplier.id);
        const purchased = num(totalsRow?._sum.total);
        const paid = num(totalsRow?._sum.paidAmount);
        return {
          ...supplier,
          totalPurchases: round2(purchased),
          outstandingBalance: round2(purchased - paid),
        };
      }),
      meta: pageMeta(total, query),
    });
  }),
);

suppliersRouter.get(
  '/:id',
  requirePermission('supplier:view'),
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!supplier) throw notFound('Supplier');

    const [purchases, products, totals] = await Promise.all([
      prisma.purchase.findMany({
        where: { supplierId: supplier.id },
        orderBy: { orderDate: 'desc' },
        take: 50,
        include: { _count: { select: { items: true } }, location: { select: { name: true } } },
      }),
      prisma.product.findMany({
        where: { supplierId: supplier.id },
        orderBy: { name: 'asc' },
        take: 100,
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
          sellingPrice: true,
          variants: { select: { inventory: { select: { quantity: true } } } },
        },
      }),
      prisma.purchase.aggregate({
        where: { supplierId: supplier.id, status: { not: PurchaseStatus.CANCELLED } },
        _sum: { total: true, paidAmount: true },
        _count: true,
      }),
    ]);

    const purchased = num(totals._sum.total);
    const paid = num(totals._sum.paidAmount);

    res.json({
      data: {
        ...supplier,
        stats: {
          purchaseCount: totals._count,
          totalPurchases: round2(purchased),
          totalPaid: round2(paid),
          outstandingBalance: round2(purchased - paid),
          productCount: products.length,
        },
        purchases: purchases.map((p) => ({ ...p, total: num(p.total), paidAmount: num(p.paidAmount) })),
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          status: product.status,
          sellingPrice: num(product.sellingPrice),
          stock: product.variants.reduce(
            (sum, v) => sum + v.inventory.reduce((s, i) => s + i.quantity, 0),
            0,
          ),
        })),
      },
    });
  }),
);

suppliersRouter.post(
  '/',
  requirePermission('supplier:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(supplierInput, req.body);
    const supplier = await prisma.supplier.create({ data: input });
    await auditFromRequest(req, {
      action: 'supplier.created',
      entity: 'Supplier',
      entityId: supplier.id,
      after: supplier,
    });
    res.status(201).json({ data: supplier });
  }),
);

suppliersRouter.put(
  '/:id',
  requirePermission('supplier:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(supplierInput.partial(), req.body);
    const before = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Supplier');
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: input });
    await auditFromRequest(req, {
      action: 'supplier.updated',
      entity: 'Supplier',
      entityId: supplier.id,
      before,
      after: supplier,
    });
    res.json({ data: supplier });
  }),
);

suppliersRouter.delete(
  '/:id',
  requirePermission('supplier:manage'),
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { purchases: true, products: true } } },
    });
    if (!supplier) throw notFound('Supplier');
    if (supplier._count.purchases > 0) {
      throw conflict(
        `${supplier.name} has ${supplier._count.purchases} purchase(s) on record. Set the supplier to inactive instead so the history stays auditable.`,
      );
    }
    if (supplier._count.products > 0) {
      throw conflict(`${supplier.name} is linked to ${supplier._count.products} product(s).`);
    }
    await prisma.supplier.delete({ where: { id: supplier.id } });
    await auditFromRequest(req, {
      action: 'supplier.deleted',
      entity: 'Supplier',
      entityId: supplier.id,
      before: supplier,
    });
    res.json({ ok: true });
  }),
);
