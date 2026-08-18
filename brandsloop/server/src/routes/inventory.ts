import { Router } from 'express';
import { MovementType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { listQuery, pageMeta, paginate, parse } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { num, round2 } from '../lib/money.js';
import { stockStatus } from '../services/inventory.js';

export const inventoryRouter = Router();

const inventoryQuery = listQuery.extend({
  locationId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  status: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK']).optional(),
  /** Roll variants up so each row is one variant across all locations. */
  groupByVariant: z.coerce.boolean().default(false),
});

type InventoryRow = {
  inventoryId: string | null;
  variantId: string;
  productId: string;
  productName: string;
  productSku: string;
  variantSku: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  categoryName: string | null;
  supplierName: string | null;
  brandName: string | null;
  locationId: string | null;
  locationName: string | null;
  quantity: number;
  reserved: number;
  damaged: number;
  minStock: number;
  reorderLevel: number;
  maxStock: number | null;
  costPrice: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
};

/**
 * The inventory grid is built with SQL rather than the Prisma query builder:
 * stock status compares two columns (quantity vs. the variant's threshold),
 * which has to happen in the database for pagination totals to be correct.
 */
function buildFilters(query: z.infer<typeof inventoryQuery>): Prisma.Sql {
  const clauses: Prisma.Sql[] = [Prisma.sql`v."isActive" = true`];
  if (query.locationId) clauses.push(Prisma.sql`i."locationId" = ${query.locationId}`);
  if (query.categoryId) {
    clauses.push(
      Prisma.sql`(p."categoryId" = ${query.categoryId} OR c."parentId" = ${query.categoryId})`,
    );
  }
  if (query.supplierId) clauses.push(Prisma.sql`p."supplierId" = ${query.supplierId}`);
  if (query.brandId) clauses.push(Prisma.sql`p."brandId" = ${query.brandId}`);
  if (query.size) clauses.push(Prisma.sql`v.size = ${query.size}`);
  if (query.color) clauses.push(Prisma.sql`v.color = ${query.color}`);
  if (query.search) {
    const like = `%${query.search}%`;
    clauses.push(
      Prisma.sql`(p.name ILIKE ${like} OR v.sku ILIKE ${like} OR p.sku ILIKE ${like} OR v.barcode ILIKE ${like} OR v.color ILIKE ${like} OR v.size ILIKE ${like})`,
    );
  }
  if (query.status) {
    const threshold = Prisma.sql`GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"), COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel"))`;
    const qty = Prisma.sql`COALESCE(i.quantity, 0)`;
    if (query.status === 'OUT_OF_STOCK') clauses.push(Prisma.sql`${qty} <= 0`);
    if (query.status === 'LOW_STOCK') {
      clauses.push(Prisma.sql`${qty} > 0 AND ${threshold} > 0 AND ${qty} <= ${threshold}`);
    }
    if (query.status === 'IN_STOCK') {
      clauses.push(Prisma.sql`${qty} > 0 AND (${threshold} = 0 OR ${qty} > ${threshold})`);
    }
    if (query.status === 'OVERSTOCK') {
      clauses.push(Prisma.sql`p."maxStock" IS NOT NULL AND p."maxStock" > 0 AND ${qty} > p."maxStock"`);
    }
  }
  return Prisma.join(clauses, ' AND ');
}

const SORT_COLUMNS: Record<string, Prisma.Sql> = {
  product: Prisma.sql`p.name`,
  sku: Prisma.sql`v.sku`,
  quantity: Prisma.sql`COALESCE(i.quantity, 0)`,
  location: Prisma.sql`l.name`,
  costValue: Prisma.sql`COALESCE(i.quantity, 0) * v."costPrice"`,
  retailValue: Prisma.sql`COALESCE(i.quantity, 0) * v."sellingPrice"`,
};

inventoryRouter.get(
  '/',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const query = parse(inventoryQuery, req.query);
    const where = buildFilters(query);
    const { skip, take } = paginate(query);
    const sortCol = SORT_COLUMNS[query.sortBy ?? ''] ?? Prisma.sql`p.name`;
    const direction = query.sortDir === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const from = Prisma.sql`
      FROM "ProductVariant" v
      JOIN "Product" p ON p.id = v."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "Supplier" s ON s.id = p."supplierId"
      LEFT JOIN "Brand" b ON b.id = p."brandId"
      LEFT JOIN "Inventory" i ON i."variantId" = v.id
      LEFT JOIN "Location" l ON l.id = i."locationId"
      WHERE ${where}
    `;

    const [countRow, rows] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count ${from}`),
      prisma.$queryRaw<InventoryRow[]>(Prisma.sql`
        SELECT i.id            AS "inventoryId",
               v.id            AS "variantId",
               p.id            AS "productId",
               p.name          AS "productName",
               p.sku           AS "productSku",
               v.sku           AS "variantSku",
               v.barcode       AS "barcode",
               v.size          AS "size",
               v.color         AS "color",
               c.name          AS "categoryName",
               s.name          AS "supplierName",
               b.name          AS "brandName",
               i."locationId"  AS "locationId",
               l.name          AS "locationName",
               COALESCE(i.quantity, 0) AS "quantity",
               COALESCE(i.reserved, 0) AS "reserved",
               COALESCE(i.damaged, 0)  AS "damaged",
               GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"), 0)         AS "minStock",
               GREATEST(COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel"), 0) AS "reorderLevel",
               p."maxStock"    AS "maxStock",
               v."costPrice"   AS "costPrice",
               v."sellingPrice" AS "sellingPrice"
        ${from}
        ORDER BY ${sortCol} ${direction}, v.sku ASC
        LIMIT ${take} OFFSET ${skip}
      `),
    ]);

    const data = rows.map((row) => {
      const costPrice = num(row.costPrice);
      const sellingPrice = num(row.sellingPrice);
      return {
        ...row,
        quantity: Number(row.quantity),
        reserved: Number(row.reserved),
        damaged: Number(row.damaged),
        minStock: Number(row.minStock),
        reorderLevel: Number(row.reorderLevel),
        available: Number(row.quantity) - Number(row.reserved),
        costPrice,
        sellingPrice,
        costValue: round2(Number(row.quantity) * costPrice),
        retailValue: round2(Number(row.quantity) * sellingPrice),
        status: stockStatus({
          quantity: Number(row.quantity),
          minStock: Number(row.minStock),
          reorderLevel: Number(row.reorderLevel),
          maxStock: row.maxStock,
        }),
      };
    });

    res.json({ data, meta: pageMeta(Number(countRow[0]?.count ?? 0), query) });
  }),
);

/** Headline valuation figures used by the dashboard and inventory report. */
inventoryRouter.get(
  '/summary',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const locationId = typeof req.query.locationId === 'string' ? req.query.locationId : undefined;
    const locationFilter = locationId
      ? Prisma.sql`AND i."locationId" = ${locationId}`
      : Prisma.empty;

    const [totals] = await prisma.$queryRaw<
      {
        totalUnits: bigint | null;
        costValue: string | null;
        retailValue: string | null;
        variantCount: bigint;
        outOfStock: bigint;
        lowStock: bigint;
      }[]
    >(Prisma.sql`
      WITH stock AS (
        SELECT v.id,
               COALESCE(SUM(i.quantity), 0) AS qty,
               v."costPrice", v."sellingPrice",
               GREATEST(COALESCE(NULLIF(v."minStock",0), p."minStock"),
                        COALESCE(NULLIF(v."reorderLevel",0), p."reorderLevel")) AS threshold
        FROM "ProductVariant" v
        JOIN "Product" p ON p.id = v."productId"
        LEFT JOIN "Inventory" i ON i."variantId" = v.id ${locationFilter}
        WHERE v."isActive" = true
        GROUP BY v.id, v."costPrice", v."sellingPrice", p."minStock", p."reorderLevel"
      )
      SELECT SUM(qty)::bigint                                   AS "totalUnits",
             COALESCE(SUM(qty * "costPrice"), 0)                AS "costValue",
             COALESCE(SUM(qty * "sellingPrice"), 0)             AS "retailValue",
             COUNT(*)::bigint                                   AS "variantCount",
             COUNT(*) FILTER (WHERE qty <= 0)::bigint           AS "outOfStock",
             COUNT(*) FILTER (WHERE qty > 0 AND threshold > 0 AND qty <= threshold)::bigint AS "lowStock"
      FROM stock
    `);

    const productCount = await prisma.product.count({ where: { status: 'ACTIVE' } });
    const costValue = num(totals?.costValue ?? 0);
    const retailValue = num(totals?.retailValue ?? 0);

    res.json({
      data: {
        productCount,
        variantCount: Number(totals?.variantCount ?? 0),
        totalUnits: Number(totals?.totalUnits ?? 0),
        costValue: round2(costValue),
        retailValue: round2(retailValue),
        potentialProfit: round2(retailValue - costValue),
        lowStock: Number(totals?.lowStock ?? 0),
        outOfStock: Number(totals?.outOfStock ?? 0),
      },
    });
  }),
);

/** Distinct sizes/colours present in the catalogue, for filter dropdowns. */
inventoryRouter.get(
  '/filters',
  requirePermission('inventory:view'),
  asyncHandler(async (_req, res) => {
    const [sizes, colors] = await Promise.all([
      prisma.productVariant.findMany({
        where: { size: { not: null } },
        distinct: ['size'],
        select: { size: true },
        orderBy: { size: 'asc' },
      }),
      prisma.productVariant.findMany({
        where: { color: { not: null } },
        distinct: ['color'],
        select: { color: true },
        orderBy: { color: 'asc' },
      }),
    ]);
    res.json({
      data: {
        sizes: sizes.map((s) => s.size).filter(Boolean),
        colors: colors.map((c) => c.color).filter(Boolean),
      },
    });
  }),
);

const movementQuery = listQuery.extend({
  variantId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  locationId: z.string().trim().optional(),
  type: z.nativeEnum(MovementType).optional(),
  userId: z.string().trim().optional(),
});

inventoryRouter.get(
  '/movements',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const query = parse(movementQuery, req.query);
    const where: Prisma.StockMovementWhereInput = {};
    if (query.variantId) where.variantId = query.variantId;
    if (query.productId) where.variant = { productId: query.productId };
    if (query.locationId) where.locationId = query.locationId;
    if (query.type) where.type = query.type;
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { variant: { sku: { contains: query.search, mode: 'insensitive' } } },
        { variant: { product: { name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        ...paginate(query),
        orderBy: { createdAt: query.sortDir },
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
          location: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.json({ data: movements, meta: pageMeta(total, query) });
  }),
);

/**
 * Barcode / SKU lookup used by the scanner page and the sale + purchase forms.
 * Accepts a variant barcode, a variant SKU, a product barcode or a product SKU.
 */
inventoryRouter.get(
  '/lookup/:code',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const code = req.params.code.trim();
    const variant = await prisma.productVariant.findFirst({
      where: {
        OR: [
          { barcode: code },
          { sku: code },
          { product: { OR: [{ barcode: code }, { sku: code }] } },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            imageUrl: true,
            taxRate: true,
            category: { select: { name: true } },
            supplier: { select: { name: true } },
          },
        },
        inventory: { include: { location: { select: { id: true, name: true, code: true } } } },
      },
    });
    if (!variant) throw notFound(`No product matches "${code}"`);

    const totalStock = variant.inventory.reduce((sum, row) => sum + row.quantity, 0);
    res.json({
      data: {
        variantId: variant.id,
        productId: variant.product.id,
        productName: variant.product.name,
        productSku: variant.product.sku,
        imageUrl: variant.product.imageUrl,
        category: variant.product.category?.name ?? null,
        supplier: variant.product.supplier?.name ?? null,
        sku: variant.sku,
        barcode: variant.barcode,
        size: variant.size,
        color: variant.color,
        costPrice: num(variant.costPrice),
        sellingPrice: num(variant.sellingPrice),
        taxRate: num(variant.product.taxRate),
        totalStock,
        stockByLocation: variant.inventory.map((row) => ({
          locationId: row.locationId,
          location: row.location,
          quantity: row.quantity,
          reserved: row.reserved,
          damaged: row.damaged,
        })),
      },
    });
  }),
);

/** Type-ahead variant picker used by sale, purchase, transfer and count forms. */
inventoryRouter.get(
  '/variants',
  requirePermission('inventory:view'),
  asyncHandler(async (req, res) => {
    const query = parse(
      z.object({
        search: z.string().trim().max(120).optional(),
        locationId: z.string().trim().optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      }),
      req.query,
    );

    const where: Prisma.ProductVariantWhereInput = { isActive: true };
    if (query.search) {
      where.OR = [
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
        { product: { sku: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const variants = await prisma.productVariant.findMany({
      where,
      take: query.limit,
      orderBy: { product: { name: 'asc' } },
      include: {
        product: { select: { id: true, name: true, taxRate: true, imageUrl: true } },
        inventory: query.locationId
          ? { where: { locationId: query.locationId }, select: { quantity: true, reserved: true } }
          : { select: { quantity: true, reserved: true } },
      },
    });

    res.json({
      data: variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        barcode: variant.barcode,
        size: variant.size,
        color: variant.color,
        costPrice: num(variant.costPrice),
        sellingPrice: num(variant.sellingPrice),
        productId: variant.product.id,
        productName: variant.product.name,
        imageUrl: variant.product.imageUrl,
        taxRate: num(variant.product.taxRate),
        stock: variant.inventory.reduce((sum, row) => sum + row.quantity, 0),
        available: variant.inventory.reduce((sum, row) => sum + row.quantity - row.reserved, 0),
      })),
    });
  }),
);
