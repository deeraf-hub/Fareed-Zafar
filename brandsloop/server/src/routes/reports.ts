import { Router } from 'express';
import { MovementType, Prisma, PurchaseStatus, SaleStatus } from '@prisma/client';
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { requirePermission } from '../middleware/auth.js';
import { num, round2 } from '../lib/money.js';
import { csvFilename, toCsv, type CsvColumn } from '../lib/csv.js';
import { resolveRange } from './dashboard.js';

export const reportsRouter = Router();

const reportQuery = z.object({
  range: z.enum(['today', 'yesterday', 'last7', 'last30', 'month', 'custom']).default('last30'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  locationId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  type: z.nativeEnum(MovementType).optional(),
  format: z.enum(['json', 'csv']).default('json'),
  limit: z.coerce.number().int().min(1).max(5000).default(500),
});

type ReportQuery = z.infer<typeof reportQuery>;

/** Streams a report as CSV when `format=csv`, otherwise returns JSON. */
function respond<T>(
  res: Response,
  query: ReportQuery,
  name: string,
  rows: T[],
  columns: CsvColumn<T>[],
  extra: Record<string, unknown> = {},
) {
  if (query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${csvFilename(name)}"`);
    res.send(toCsv(rows, columns));
    return;
  }
  res.json({ data: rows, ...extra });
}

// ── Inventory valuation ──────────────────────────────────────────────────────
reportsRouter.get(
  '/inventory',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const filters: Prisma.Sql[] = [Prisma.sql`v."isActive" = true`];
    if (query.locationId) filters.push(Prisma.sql`i."locationId" = ${query.locationId}`);
    if (query.categoryId) {
      filters.push(Prisma.sql`(p."categoryId" = ${query.categoryId} OR c."parentId" = ${query.categoryId})`);
    }
    if (query.supplierId) filters.push(Prisma.sql`p."supplierId" = ${query.supplierId}`);
    if (query.productId) filters.push(Prisma.sql`p.id = ${query.productId}`);

    const rows = await prisma.$queryRaw<
      {
        product: string;
        productSku: string;
        sku: string;
        variant: string;
        category: string | null;
        location: string | null;
        quantity: bigint;
        costPrice: string;
        sellingPrice: string;
        costValue: string;
        retailValue: string;
      }[]
    >(Prisma.sql`
      SELECT p.name AS product, p.sku AS "productSku", v.sku AS sku,
             TRIM(BOTH ' / ' FROM CONCAT_WS(' / ', v.color, v.size)) AS variant,
             c.name AS category, l.name AS location,
             COALESCE(i.quantity, 0)::bigint AS quantity,
             v."costPrice", v."sellingPrice",
             COALESCE(i.quantity, 0) * v."costPrice"    AS "costValue",
             COALESCE(i.quantity, 0) * v."sellingPrice" AS "retailValue"
      FROM "ProductVariant" v
      JOIN "Product" p ON p.id = v."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "Inventory" i ON i."variantId" = v.id
      LEFT JOIN "Location" l ON l.id = i."locationId"
      WHERE ${Prisma.join(filters, ' AND ')}
      ORDER BY p.name, v.sku
      LIMIT ${query.limit}
    `);

    const data = rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      costPrice: num(row.costPrice),
      sellingPrice: num(row.sellingPrice),
      costValue: round2(num(row.costValue)),
      retailValue: round2(num(row.retailValue)),
    }));

    respond(
      res,
      query,
      'inventory-report',
      data,
      [
        { header: 'Product', value: (r) => r.product },
        { header: 'SKU', value: (r) => r.sku },
        { header: 'Variant', value: (r) => r.variant },
        { header: 'Category', value: (r) => r.category },
        { header: 'Location', value: (r) => r.location },
        { header: 'Stock', value: (r) => r.quantity },
        { header: 'Cost price', value: (r) => r.costPrice },
        { header: 'Selling price', value: (r) => r.sellingPrice },
        { header: 'Cost value', value: (r) => r.costValue },
        { header: 'Retail value', value: (r) => r.retailValue },
      ],
      {
        totals: {
          units: data.reduce((sum, r) => sum + r.quantity, 0),
          costValue: round2(data.reduce((sum, r) => sum + r.costValue, 0)),
          retailValue: round2(data.reduce((sum, r) => sum + r.retailValue, 0)),
          potentialProfit: round2(
            data.reduce((sum, r) => sum + r.retailValue - r.costValue, 0),
          ),
        },
      },
    );
  }),
);

// ── Stock movements ──────────────────────────────────────────────────────────
reportsRouter.get(
  '/stock-movements',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const { from, to } = resolveRange(query);
    const where: Prisma.StockMovementWhereInput = { createdAt: { gte: from, lte: to } };
    if (query.locationId) where.locationId = query.locationId;
    if (query.type) where.type = query.type;
    if (query.userId) where.userId = query.userId;
    if (query.productId) where.variant = { productId: query.productId };

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: {
        variant: {
          select: { sku: true, size: true, color: true, product: { select: { name: true } } },
        },
        location: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    const data = movements.map((movement) => ({
      date: movement.createdAt,
      product: movement.variant.product.name,
      sku: movement.variant.sku,
      variant: [movement.variant.color, movement.variant.size].filter(Boolean).join(' / '),
      location: movement.location.name,
      type: movement.type,
      quantity: movement.quantity,
      previousQty: movement.previousQty,
      newQty: movement.newQty,
      reference: movement.referenceNumber,
      user: movement.user?.name ?? 'System',
      notes: movement.notes,
    }));

    respond(res, query, 'stock-movements', data, [
      { header: 'Date', value: (r) => r.date },
      { header: 'Product', value: (r) => r.product },
      { header: 'SKU', value: (r) => r.sku },
      { header: 'Variant', value: (r) => r.variant },
      { header: 'Location', value: (r) => r.location },
      { header: 'Type', value: (r) => r.type },
      { header: 'Quantity', value: (r) => r.quantity },
      { header: 'Previous', value: (r) => r.previousQty },
      { header: 'New', value: (r) => r.newQty },
      { header: 'Reference', value: (r) => r.reference },
      { header: 'User', value: (r) => r.user },
      { header: 'Notes', value: (r) => r.notes },
    ]);
  }),
);

// ── Purchases ────────────────────────────────────────────────────────────────
reportsRouter.get(
  '/purchases',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const { from, to } = resolveRange(query);
    const where: Prisma.PurchaseWhereInput = {
      orderDate: { gte: from, lte: to },
      status: { not: PurchaseStatus.CANCELLED },
    };
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.locationId) where.locationId = query.locationId;

    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { orderDate: 'desc' },
      take: query.limit,
      include: {
        supplier: { select: { name: true } },
        location: { select: { name: true } },
        items: true,
      },
    });

    const data = purchases.map((purchase) => ({
      number: purchase.number,
      date: purchase.orderDate,
      supplier: purchase.supplier.name,
      location: purchase.location.name,
      status: purchase.status,
      units: purchase.items.reduce((sum, item) => sum + item.quantity, 0),
      received: purchase.items.reduce((sum, item) => sum + item.receivedQty, 0),
      subtotal: num(purchase.subtotal),
      discount: num(purchase.discount),
      tax: num(purchase.tax),
      total: num(purchase.total),
      paid: num(purchase.paidAmount),
      outstanding: round2(num(purchase.total) - num(purchase.paidAmount)),
    }));

    respond(
      res,
      query,
      'purchase-report',
      data,
      [
        { header: 'Purchase #', value: (r) => r.number },
        { header: 'Date', value: (r) => r.date },
        { header: 'Supplier', value: (r) => r.supplier },
        { header: 'Location', value: (r) => r.location },
        { header: 'Status', value: (r) => r.status },
        { header: 'Units ordered', value: (r) => r.units },
        { header: 'Units received', value: (r) => r.received },
        { header: 'Total', value: (r) => r.total },
        { header: 'Paid', value: (r) => r.paid },
        { header: 'Outstanding', value: (r) => r.outstanding },
      ],
      {
        totals: {
          orders: data.length,
          units: data.reduce((sum, r) => sum + r.units, 0),
          total: round2(data.reduce((sum, r) => sum + r.total, 0)),
          outstanding: round2(data.reduce((sum, r) => sum + r.outstanding, 0)),
        },
      },
    );
  }),
);

// ── Sales ────────────────────────────────────────────────────────────────────
reportsRouter.get(
  '/sales',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const { from, to } = resolveRange(query);
    const where: Prisma.SaleWhereInput = {
      saleDate: { gte: from, lte: to },
      status: SaleStatus.COMPLETED,
    };
    if (query.locationId) where.locationId = query.locationId;

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { saleDate: 'desc' },
      take: query.limit,
      include: {
        customer: { select: { name: true } },
        location: { select: { name: true } },
        items: true,
      },
    });

    const canSeeProfit = req.user!.role !== 'STAFF';
    const data = sales.map((sale) => ({
      number: sale.number,
      date: sale.saleDate,
      customer: sale.customer?.name ?? 'Walk-in',
      location: sale.location.name,
      units: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: num(sale.subtotal),
      discount: num(sale.discount),
      tax: num(sale.tax),
      total: num(sale.total),
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      profit: canSeeProfit
        ? round2(
            sale.items.reduce(
              (sum, item) => sum + num(item.total) - num(item.unitCost) * item.quantity,
              0,
            ),
          )
        : null,
    }));

    respond(
      res,
      query,
      'sales-report',
      data,
      [
        { header: 'Sale #', value: (r) => r.number },
        { header: 'Date', value: (r) => r.date },
        { header: 'Customer', value: (r) => r.customer },
        { header: 'Location', value: (r) => r.location },
        { header: 'Units', value: (r) => r.units },
        { header: 'Discount', value: (r) => r.discount },
        { header: 'Tax', value: (r) => r.tax },
        { header: 'Total', value: (r) => r.total },
        { header: 'Payment', value: (r) => r.paymentMethod },
        { header: 'Status', value: (r) => r.paymentStatus },
      ],
      {
        totals: {
          orders: data.length,
          units: data.reduce((sum, r) => sum + r.units, 0),
          revenue: round2(data.reduce((sum, r) => sum + r.total, 0)),
          profit: canSeeProfit ? round2(data.reduce((sum, r) => sum + (r.profit ?? 0), 0)) : null,
        },
      },
    );
  }),
);

// ── Profit ───────────────────────────────────────────────────────────────────
reportsRouter.get(
  '/profit',
  requirePermission('report:financial'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const { from, to, label } = resolveRange(query);

    const [byProduct, byDay] = await Promise.all([
      prisma.$queryRaw<
        { product: string; sku: string; units: bigint; revenue: string; cost: string }[]
      >(Prisma.sql`
        SELECT p.name AS product, p.sku AS sku,
               SUM(si.quantity)::bigint AS units,
               COALESCE(SUM(si.total), 0) AS revenue,
               COALESCE(SUM(si."unitCost" * si.quantity), 0) AS cost
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        JOIN "ProductVariant" v ON v.id = si."variantId"
        JOIN "Product" p ON p.id = v."productId"
        WHERE s.status = 'COMPLETED' AND s."saleDate" BETWEEN ${from} AND ${to}
          ${query.locationId ? Prisma.sql`AND s."locationId" = ${query.locationId}` : Prisma.empty}
          ${query.categoryId ? Prisma.sql`AND p."categoryId" = ${query.categoryId}` : Prisma.empty}
        GROUP BY p.id, p.name, p.sku
        ORDER BY (COALESCE(SUM(si.total), 0) - COALESCE(SUM(si."unitCost" * si.quantity), 0)) DESC
        LIMIT ${query.limit}
      `),
      prisma.$queryRaw<{ day: Date; revenue: string; cost: string }[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', s."saleDate") AS day,
               COALESCE(SUM(si.total), 0) AS revenue,
               COALESCE(SUM(si."unitCost" * si.quantity), 0) AS cost
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s.status = 'COMPLETED' AND s."saleDate" BETWEEN ${from} AND ${to}
          ${query.locationId ? Prisma.sql`AND s."locationId" = ${query.locationId}` : Prisma.empty}
        GROUP BY 1 ORDER BY 1
      `),
    ]);

    const data = byProduct.map((row) => {
      const revenue = round2(num(row.revenue));
      const cost = round2(num(row.cost));
      const profit = round2(revenue - cost);
      return {
        product: row.product,
        sku: row.sku,
        units: Number(row.units),
        revenue,
        cost,
        profit,
        margin: revenue > 0 ? round2((profit / revenue) * 100) : 0,
      };
    });

    const revenue = round2(data.reduce((sum, r) => sum + r.revenue, 0));
    const cost = round2(data.reduce((sum, r) => sum + r.cost, 0));

    respond(
      res,
      query,
      'profit-report',
      data,
      [
        { header: 'Product', value: (r) => r.product },
        { header: 'SKU', value: (r) => r.sku },
        { header: 'Units sold', value: (r) => r.units },
        { header: 'Revenue', value: (r) => r.revenue },
        { header: 'Cost', value: (r) => r.cost },
        { header: 'Gross profit', value: (r) => r.profit },
        { header: 'Margin %', value: (r) => r.margin },
      ],
      {
        range: { from, to, label },
        totals: {
          revenue,
          cost,
          grossProfit: round2(revenue - cost),
          margin: revenue > 0 ? round2(((revenue - cost) / revenue) * 100) : 0,
        },
        series: byDay.map((row) => ({
          date: new Date(row.day).toISOString().slice(0, 10),
          revenue: round2(num(row.revenue)),
          cost: round2(num(row.cost)),
          profit: round2(num(row.revenue) - num(row.cost)),
        })),
      },
    );
  }),
);

// ── Low stock / out of stock / damaged ───────────────────────────────────────
async function stockLevelReport(kind: 'low' | 'out', limit: number) {
  const having =
    kind === 'out'
      ? Prisma.sql`COALESCE(SUM(i.quantity), 0) <= 0`
      : Prisma.sql`COALESCE(SUM(i.quantity), 0) > 0
          AND GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"),
                       COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel")) > 0
          AND COALESCE(SUM(i.quantity), 0) <= GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"),
                       COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel"))`;

  return prisma.$queryRaw<
    {
      product: string;
      sku: string;
      variant: string;
      supplier: string | null;
      quantity: bigint;
      threshold: number;
      costPrice: string;
    }[]
  >(Prisma.sql`
    SELECT p.name AS product, v.sku,
           TRIM(BOTH ' / ' FROM CONCAT_WS(' / ', v.color, v.size)) AS variant,
           s.name AS supplier,
           COALESCE(SUM(i.quantity), 0)::bigint AS quantity,
           GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"),
                    COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel")) AS threshold,
           v."costPrice"
    FROM "ProductVariant" v
    JOIN "Product" p ON p.id = v."productId"
    LEFT JOIN "Supplier" s ON s.id = p."supplierId"
    LEFT JOIN "Inventory" i ON i."variantId" = v.id
    WHERE v."isActive" = true AND p.status = 'ACTIVE'
    GROUP BY p.id, p.name, v.id, v.sku, v.color, v.size, s.name, p."minStock", p."reorderLevel", v."costPrice"
    HAVING ${having}
    ORDER BY quantity ASC, p.name
    LIMIT ${limit}
  `);
}

reportsRouter.get(
  '/low-stock',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const rows = await stockLevelReport('low', query.limit);
    const data = rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      threshold: Number(row.threshold),
      costPrice: num(row.costPrice),
      shortfall: Math.max(0, Number(row.threshold) - Number(row.quantity)),
    }));
    respond(res, query, 'low-stock-report', data, [
      { header: 'Product', value: (r) => r.product },
      { header: 'SKU', value: (r) => r.sku },
      { header: 'Variant', value: (r) => r.variant },
      { header: 'Supplier', value: (r) => r.supplier },
      { header: 'Stock', value: (r) => r.quantity },
      { header: 'Reorder level', value: (r) => r.threshold },
      { header: 'Shortfall', value: (r) => r.shortfall },
    ]);
  }),
);

reportsRouter.get(
  '/out-of-stock',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const rows = await stockLevelReport('out', query.limit);
    const data = rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      threshold: Number(row.threshold),
      costPrice: num(row.costPrice),
    }));
    respond(res, query, 'out-of-stock-report', data, [
      { header: 'Product', value: (r) => r.product },
      { header: 'SKU', value: (r) => r.sku },
      { header: 'Variant', value: (r) => r.variant },
      { header: 'Supplier', value: (r) => r.supplier },
      { header: 'Reorder level', value: (r) => r.threshold },
    ]);
  }),
);

reportsRouter.get(
  '/damaged',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const { from, to } = resolveRange(query);
    const movements = await prisma.stockMovement.findMany({
      where: {
        type: { in: [MovementType.DAMAGED, MovementType.LOST] },
        createdAt: { gte: from, lte: to },
        ...(query.locationId ? { locationId: query.locationId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: {
        variant: {
          select: {
            sku: true,
            size: true,
            color: true,
            costPrice: true,
            product: { select: { name: true } },
          },
        },
        location: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    const data = movements.map((movement) => ({
      date: movement.createdAt,
      product: movement.variant.product.name,
      sku: movement.variant.sku,
      variant: [movement.variant.color, movement.variant.size].filter(Boolean).join(' / '),
      location: movement.location.name,
      type: movement.type,
      quantity: Math.abs(movement.quantity),
      costValue: round2(Math.abs(movement.quantity) * num(movement.variant.costPrice)),
      reference: movement.referenceNumber,
      user: movement.user?.name ?? 'System',
      notes: movement.notes,
    }));

    respond(
      res,
      query,
      'damaged-stock-report',
      data,
      [
        { header: 'Date', value: (r) => r.date },
        { header: 'Product', value: (r) => r.product },
        { header: 'SKU', value: (r) => r.sku },
        { header: 'Variant', value: (r) => r.variant },
        { header: 'Location', value: (r) => r.location },
        { header: 'Type', value: (r) => r.type },
        { header: 'Quantity', value: (r) => r.quantity },
        { header: 'Cost value', value: (r) => r.costValue },
        { header: 'Notes', value: (r) => r.notes },
      ],
      { totals: { units: data.reduce((s, r) => s + r.quantity, 0), costValue: round2(data.reduce((s, r) => s + r.costValue, 0)) } },
    );
  }),
);

// ── Suppliers ────────────────────────────────────────────────────────────────
reportsRouter.get(
  '/suppliers',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const { from, to } = resolveRange(query);
    const rows = await prisma.$queryRaw<
      {
        supplier: string;
        orders: bigint;
        units: bigint;
        total: string;
        paid: string;
        products: bigint;
      }[]
    >(Prisma.sql`
      SELECT s.name AS supplier,
             COUNT(DISTINCT pu.id)::bigint AS orders,
             COALESCE(SUM(pi.quantity), 0)::bigint AS units,
             COALESCE(SUM(DISTINCT pu.total), 0) AS total,
             COALESCE(SUM(DISTINCT pu."paidAmount"), 0) AS paid,
             (SELECT COUNT(*) FROM "Product" p WHERE p."supplierId" = s.id)::bigint AS products
      FROM "Supplier" s
      LEFT JOIN "Purchase" pu ON pu."supplierId" = s.id
        AND pu.status <> 'CANCELLED' AND pu."orderDate" BETWEEN ${from} AND ${to}
      LEFT JOIN "PurchaseItem" pi ON pi."purchaseId" = pu.id
      GROUP BY s.id, s.name
      ORDER BY total DESC
      LIMIT ${query.limit}
    `);

    const data = rows.map((row) => ({
      supplier: row.supplier,
      orders: Number(row.orders),
      units: Number(row.units),
      products: Number(row.products),
      total: round2(num(row.total)),
      paid: round2(num(row.paid)),
      outstanding: round2(num(row.total) - num(row.paid)),
    }));

    respond(res, query, 'supplier-report', data, [
      { header: 'Supplier', value: (r) => r.supplier },
      { header: 'Products supplied', value: (r) => r.products },
      { header: 'Orders', value: (r) => r.orders },
      { header: 'Units purchased', value: (r) => r.units },
      { header: 'Total purchased', value: (r) => r.total },
      { header: 'Paid', value: (r) => r.paid },
      { header: 'Outstanding', value: (r) => r.outstanding },
    ]);
  }),
);

// ── Categories ───────────────────────────────────────────────────────────────
reportsRouter.get(
  '/categories',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const { from, to } = resolveRange(query);
    const rows = await prisma.$queryRaw<
      {
        category: string;
        products: bigint;
        units: bigint;
        costValue: string;
        retailValue: string;
        unitsSold: bigint;
        revenue: string;
      }[]
    >(Prisma.sql`
      SELECT COALESCE(c.name, 'Uncategorised') AS category,
             COUNT(DISTINCT p.id)::bigint AS products,
             COALESCE(SUM(inv.qty), 0)::bigint AS units,
             COALESCE(SUM(inv.qty * v."costPrice"), 0) AS "costValue",
             COALESCE(SUM(inv.qty * v."sellingPrice"), 0) AS "retailValue",
             COALESCE(SUM(sold.units), 0)::bigint AS "unitsSold",
             COALESCE(SUM(sold.revenue), 0) AS revenue
      FROM "ProductVariant" v
      JOIN "Product" p ON p.id = v."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(i.quantity), 0) AS qty FROM "Inventory" i WHERE i."variantId" = v.id
      ) inv ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(si.quantity), 0) AS units, COALESCE(SUM(si.total), 0) AS revenue
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
        WHERE si."variantId" = v.id AND s.status = 'COMPLETED'
          AND s."saleDate" BETWEEN ${from} AND ${to}
      ) sold ON true
      WHERE v."isActive" = true
      GROUP BY 1
      ORDER BY "retailValue" DESC
      LIMIT ${query.limit}
    `);

    const data = rows.map((row) => ({
      category: row.category,
      products: Number(row.products),
      units: Number(row.units),
      costValue: round2(num(row.costValue)),
      retailValue: round2(num(row.retailValue)),
      unitsSold: Number(row.unitsSold),
      revenue: round2(num(row.revenue)),
    }));

    respond(res, query, 'category-report', data, [
      { header: 'Category', value: (r) => r.category },
      { header: 'Products', value: (r) => r.products },
      { header: 'Stock units', value: (r) => r.units },
      { header: 'Cost value', value: (r) => r.costValue },
      { header: 'Retail value', value: (r) => r.retailValue },
      { header: 'Units sold', value: (r) => r.unitsSold },
      { header: 'Revenue', value: (r) => r.revenue },
    ]);
  }),
);

// ── Product performance ──────────────────────────────────────────────────────
reportsRouter.get(
  '/product-performance',
  requirePermission('report:view'),
  asyncHandler(async (req, res) => {
    const query = parse(reportQuery, req.query);
    const { from, to } = resolveRange(query);
    const canSeeProfit = req.user!.role !== 'STAFF';

    const rows = await prisma.$queryRaw<
      {
        product: string;
        sku: string;
        category: string | null;
        unitsSold: bigint;
        revenue: string;
        cost: string;
        stock: bigint;
      }[]
    >(Prisma.sql`
      SELECT p.name AS product, p.sku, c.name AS category,
             COALESCE(SUM(sold.units), 0)::bigint AS "unitsSold",
             COALESCE(SUM(sold.revenue), 0) AS revenue,
             COALESCE(SUM(sold.cost), 0) AS cost,
             COALESCE(SUM(inv.qty), 0)::bigint AS stock
      FROM "Product" p
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "ProductVariant" v ON v."productId" = p.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(i.quantity), 0) AS qty FROM "Inventory" i WHERE i."variantId" = v.id
      ) inv ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(si.quantity), 0) AS units,
               COALESCE(SUM(si.total), 0) AS revenue,
               COALESCE(SUM(si."unitCost" * si.quantity), 0) AS cost
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
        WHERE si."variantId" = v.id AND s.status = 'COMPLETED'
          AND s."saleDate" BETWEEN ${from} AND ${to}
      ) sold ON true
      ${query.categoryId ? Prisma.sql`WHERE p."categoryId" = ${query.categoryId}` : Prisma.empty}
      GROUP BY p.id, p.name, p.sku, c.name
      ORDER BY "unitsSold" DESC, revenue DESC
      LIMIT ${query.limit}
    `);

    const data = rows.map((row) => {
      const revenue = round2(num(row.revenue));
      const cost = round2(num(row.cost));
      return {
        product: row.product,
        sku: row.sku,
        category: row.category,
        unitsSold: Number(row.unitsSold),
        stock: Number(row.stock),
        revenue,
        ...(canSeeProfit
          ? { cost, profit: round2(revenue - cost), margin: revenue > 0 ? round2(((revenue - cost) / revenue) * 100) : 0 }
          : {}),
      };
    });

    respond(res, query, 'product-performance', data, [
      { header: 'Product', value: (r) => r.product },
      { header: 'SKU', value: (r) => r.sku },
      { header: 'Category', value: (r) => r.category },
      { header: 'Units sold', value: (r) => r.unitsSold },
      { header: 'Revenue', value: (r) => r.revenue },
      { header: 'Stock on hand', value: (r) => r.stock },
    ]);
  }),
);
