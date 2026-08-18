import { Router } from 'express';
import { Prisma, PurchaseStatus, SaleStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { requirePermission } from '../middleware/auth.js';
import { num, round2 } from '../lib/money.js';

export const dashboardRouter = Router();

const rangeQuery = z.object({
  range: z
    .enum(['today', 'yesterday', 'last7', 'last30', 'month', 'custom'])
    .default('last30'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  locationId: z.string().trim().optional(),
});

export function resolveRange(query: z.infer<typeof rangeQuery>): { from: Date; to: Date; label: string } {
  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  switch (query.range) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now), label: 'Today' };
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday), label: 'Yesterday' };
    }
    case 'last7': {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(now), label: 'Last 7 days' };
    }
    case 'month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: endOfDay(now),
        label: 'This month',
      };
    case 'custom':
      return {
        from: query.from ? startOfDay(query.from) : startOfDay(now),
        to: query.to ? endOfDay(query.to) : endOfDay(now),
        label: 'Custom range',
      };
    case 'last30':
    default: {
      const from = new Date(now);
      from.setDate(now.getDate() - 29);
      return { from: startOfDay(from), to: endOfDay(now), label: 'Last 30 days' };
    }
  }
}

dashboardRouter.get(
  '/',
  requirePermission('dashboard:view'),
  asyncHandler(async (req, res) => {
    const query = parse(rangeQuery, req.query);
    const { from, to, label } = resolveRange(query);
    const canSeeFinancials = req.user!.role !== 'STAFF';
    const locationId = query.locationId;
    const locationSql = locationId ? Prisma.sql`AND i."locationId" = ${locationId}` : Prisma.empty;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      stock,
      productCount,
      todaySales,
      todayPurchases,
      rangeSales,
      rangeProfit,
      salesSeries,
      purchaseSeries,
      topProducts,
      categoryBreakdown,
      lowStockItems,
      recentMovements,
      pendingPurchases,
    ] = await Promise.all([
      prisma.$queryRaw<
        { totalUnits: bigint | null; costValue: string; retailValue: string; lowStock: bigint; outOfStock: bigint }[]
      >(Prisma.sql`
        WITH stock AS (
          SELECT v.id,
                 COALESCE(SUM(i.quantity), 0) AS qty,
                 v."costPrice", v."sellingPrice",
                 GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"),
                          COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel")) AS threshold
          FROM "ProductVariant" v
          JOIN "Product" p ON p.id = v."productId"
          LEFT JOIN "Inventory" i ON i."variantId" = v.id ${locationSql}
          WHERE v."isActive" = true
          GROUP BY v.id, v."costPrice", v."sellingPrice", p."minStock", p."reorderLevel"
        )
        SELECT SUM(qty)::bigint AS "totalUnits",
               COALESCE(SUM(qty * "costPrice"), 0) AS "costValue",
               COALESCE(SUM(qty * "sellingPrice"), 0) AS "retailValue",
               COUNT(*) FILTER (WHERE qty > 0 AND threshold > 0 AND qty <= threshold)::bigint AS "lowStock",
               COUNT(*) FILTER (WHERE qty <= 0)::bigint AS "outOfStock"
        FROM stock
      `),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.sale.aggregate({
        where: {
          status: SaleStatus.COMPLETED,
          saleDate: { gte: todayStart, lte: todayEnd },
          ...(locationId ? { locationId } : {}),
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.purchase.aggregate({
        where: {
          status: { not: PurchaseStatus.CANCELLED },
          orderDate: { gte: todayStart, lte: todayEnd },
          ...(locationId ? { locationId } : {}),
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: {
          status: SaleStatus.COMPLETED,
          saleDate: { gte: from, lte: to },
          ...(locationId ? { locationId } : {}),
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.$queryRaw<{ revenue: string; cost: string }[]>(Prisma.sql`
        SELECT COALESCE(SUM(si.total), 0)                       AS revenue,
               COALESCE(SUM(si."unitCost" * si.quantity), 0)    AS cost
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s.status = 'COMPLETED'
          AND s."saleDate" BETWEEN ${from} AND ${to}
          ${locationId ? Prisma.sql`AND s."locationId" = ${locationId}` : Prisma.empty}
      `),
      prisma.$queryRaw<{ day: Date; total: string; orders: bigint }[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', s."saleDate") AS day,
               COALESCE(SUM(s.total), 0)       AS total,
               COUNT(*)::bigint                AS orders
        FROM "Sale" s
        WHERE s.status = 'COMPLETED' AND s."saleDate" BETWEEN ${from} AND ${to}
          ${locationId ? Prisma.sql`AND s."locationId" = ${locationId}` : Prisma.empty}
        GROUP BY 1 ORDER BY 1
      `),
      prisma.$queryRaw<{ day: Date; total: string; orders: bigint }[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', p."orderDate") AS day,
               COALESCE(SUM(p.total), 0)        AS total,
               COUNT(*)::bigint                 AS orders
        FROM "Purchase" p
        WHERE p.status <> 'CANCELLED' AND p."orderDate" BETWEEN ${from} AND ${to}
          ${locationId ? Prisma.sql`AND p."locationId" = ${locationId}` : Prisma.empty}
        GROUP BY 1 ORDER BY 1
      `),
      prisma.$queryRaw<
        { productId: string; name: string; units: bigint; revenue: string; profit: string }[]
      >(Prisma.sql`
        SELECT p.id AS "productId", p.name,
               SUM(si.quantity)::bigint                                   AS units,
               COALESCE(SUM(si.total), 0)                                 AS revenue,
               COALESCE(SUM(si.total - si."unitCost" * si.quantity), 0)   AS profit
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        JOIN "ProductVariant" v ON v.id = si."variantId"
        JOIN "Product" p ON p.id = v."productId"
        WHERE s.status = 'COMPLETED' AND s."saleDate" BETWEEN ${from} AND ${to}
          ${locationId ? Prisma.sql`AND s."locationId" = ${locationId}` : Prisma.empty}
        GROUP BY p.id, p.name
        ORDER BY units DESC
        LIMIT 8
      `),
      prisma.$queryRaw<{ category: string; units: bigint; costValue: string; retailValue: string }[]>(
        Prisma.sql`
        SELECT COALESCE(c.name, 'Uncategorised') AS category,
               COALESCE(SUM(i.quantity), 0)::bigint AS units,
               COALESCE(SUM(i.quantity * v."costPrice"), 0) AS "costValue",
               COALESCE(SUM(i.quantity * v."sellingPrice"), 0) AS "retailValue"
        FROM "ProductVariant" v
        JOIN "Product" p ON p.id = v."productId"
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        LEFT JOIN "Inventory" i ON i."variantId" = v.id ${locationSql}
        WHERE v."isActive" = true
        GROUP BY 1
        HAVING COALESCE(SUM(i.quantity), 0) > 0
        ORDER BY "retailValue" DESC
        LIMIT 10
      `,
      ),
      prisma.$queryRaw<
        { variantId: string; sku: string; name: string; size: string | null; color: string | null; qty: bigint; threshold: number }[]
      >(Prisma.sql`
        SELECT v.id AS "variantId", v.sku, p.name, v.size, v.color,
               COALESCE(SUM(i.quantity), 0)::bigint AS qty,
               GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"),
                        COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel")) AS threshold
        FROM "ProductVariant" v
        JOIN "Product" p ON p.id = v."productId"
        LEFT JOIN "Inventory" i ON i."variantId" = v.id ${locationSql}
        WHERE v."isActive" = true
        GROUP BY v.id, v.sku, p.name, v.size, v.color, p."minStock", p."reorderLevel"
        HAVING GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"),
                        COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel")) > 0
           AND COALESCE(SUM(i.quantity), 0) <= GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"),
                        COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel"))
        ORDER BY qty ASC
        LIMIT 10
      `),
      prisma.stockMovement.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        ...(locationId ? { where: { locationId } } : {}),
        include: {
          variant: {
            select: { sku: true, size: true, color: true, product: { select: { name: true } } },
          },
          location: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.purchase.count({
        where: {
          status: { in: [PurchaseStatus.ORDERED, PurchaseStatus.PARTIALLY_RECEIVED] },
          ...(locationId ? { locationId } : {}),
        },
      }),
    ]);

    const stockRow = stock[0];
    const costValue = round2(num(stockRow?.costValue ?? 0));
    const retailValue = round2(num(stockRow?.retailValue ?? 0));
    const revenue = round2(num(rangeProfit[0]?.revenue ?? 0));
    const cost = round2(num(rangeProfit[0]?.cost ?? 0));

    // Fill in days with no activity so the chart has a continuous x-axis.
    const days: string[] = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d).toISOString().slice(0, 10));
    }
    const seriesFor = (rows: { day: Date; total: string; orders: bigint }[]) =>
      days.map((day) => {
        const row = rows.find((r) => new Date(r.day).toISOString().slice(0, 10) === day);
        return { date: day, total: round2(num(row?.total ?? 0)), count: Number(row?.orders ?? 0) };
      });

    res.json({
      data: {
        range: { from, to, label },
        cards: {
          totalProducts: productCount,
          totalStockUnits: Number(stockRow?.totalUnits ?? 0),
          inventoryValue: canSeeFinancials ? costValue : null,
          inventoryRetailValue: canSeeFinancials ? retailValue : null,
          lowStockItems: Number(stockRow?.lowStock ?? 0),
          outOfStock: Number(stockRow?.outOfStock ?? 0),
          todaySales: round2(num(todaySales._sum.total)),
          todaySalesCount: todaySales._count,
          todayPurchases: canSeeFinancials ? round2(num(todayPurchases._sum.total)) : null,
          todayPurchasesCount: todayPurchases._count,
          estimatedProfit: canSeeFinancials ? round2(revenue - cost) : null,
          rangeRevenue: round2(num(rangeSales._sum.total)),
          rangeOrders: rangeSales._count,
          pendingPurchases,
        },
        charts: {
          sales: seriesFor(salesSeries),
          purchases: canSeeFinancials ? seriesFor(purchaseSeries) : [],
          topProducts: topProducts.map((row) => ({
            productId: row.productId,
            name: row.name,
            units: Number(row.units),
            revenue: round2(num(row.revenue)),
            profit: canSeeFinancials ? round2(num(row.profit)) : null,
          })),
          categories: categoryBreakdown.map((row) => ({
            category: row.category,
            units: Number(row.units),
            costValue: round2(num(row.costValue)),
            retailValue: round2(num(row.retailValue)),
          })),
        },
        lowStock: lowStockItems.map((row) => ({
          variantId: row.variantId,
          sku: row.sku,
          name: row.name,
          size: row.size,
          color: row.color,
          quantity: Number(row.qty),
          threshold: Number(row.threshold),
        })),
        recentActivity: recentMovements.map((movement) => ({
          id: movement.id,
          type: movement.type,
          quantity: movement.quantity,
          createdAt: movement.createdAt,
          referenceNumber: movement.referenceNumber,
          product: movement.variant.product.name,
          variant: [movement.variant.color, movement.variant.size].filter(Boolean).join(' / '),
          sku: movement.variant.sku,
          location: movement.location.name,
          user: movement.user?.name ?? 'System',
        })),
      },
    });
  }),
);
