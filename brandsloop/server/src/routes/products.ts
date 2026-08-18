import { Router } from 'express';
import { Prisma, ProductStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import {
  listQuery,
  money,
  nonEmpty,
  optionalText,
  orderBy,
  pageMeta,
  paginate,
  parse,
  quantity,
} from '../lib/validate.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { auditFromRequest } from '../services/audit.js';
import { generateUniqueBarcode, generateUniqueSku } from '../services/sku.js';
import { getSettings } from '../services/settings.js';
import { num, round2 } from '../lib/money.js';
import { stockStatus } from '../services/inventory.js';

export const productsRouter = Router();

const variantInput = z.object({
  id: z.string().trim().min(1).optional(),
  sku: z.string().trim().max(60).optional().nullable(),
  barcode: z.string().trim().max(60).optional().nullable(),
  size: z.string().trim().max(30).optional().nullable(),
  color: z.string().trim().max(30).optional().nullable(),
  style: z.string().trim().max(40).optional().nullable(),
  material: z.string().trim().max(40).optional().nullable(),
  fit: z.string().trim().max(40).optional().nullable(),
  costPrice: money('Cost price'),
  sellingPrice: money('Selling price'),
  minStock: quantity('Minimum stock').default(0),
  reorderLevel: quantity('Reorder level').default(0),
  isActive: z.coerce.boolean().default(true),
});

const productInput = z
  .object({
    name: nonEmpty('Product name', 160),
    sku: z.string().trim().max(60).optional().nullable(),
    barcode: z.string().trim().max(60).optional().nullable(),
    description: optionalText(3000),
    categoryId: z.string().trim().min(1).nullish(),
    brandId: z.string().trim().min(1).nullish(),
    supplierId: z.string().trim().min(1).nullish(),
    imageUrl: z.string().trim().max(600).optional().nullable(),
    images: z.array(z.string().trim().max(600)).max(8).default([]),
    costPrice: money('Cost price').default(0),
    sellingPrice: money('Selling price').default(0),
    wholesalePrice: money('Wholesale price').optional().nullable(),
    taxRate: z.coerce.number().min(0, 'Tax cannot be negative.').max(100, 'Tax cannot exceed 100%.').default(0),
    minStock: quantity('Minimum stock').default(0),
    maxStock: quantity('Maximum stock').optional().nullable(),
    reorderLevel: quantity('Reorder level').default(0),
    status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
    variants: z.array(variantInput).max(200).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.maxStock != null && value.maxStock > 0 && value.maxStock < value.minStock) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxStock'],
        message: 'Maximum stock must be greater than minimum stock.',
      });
    }
    const combos = new Set<string>();
    for (const variant of value.variants) {
      const key = [variant.size, variant.color, variant.style, variant.fit, variant.material]
        .map((part) => (part ?? '').trim().toLowerCase())
        .join('|');
      if (combos.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants'],
          message: 'Two variants have the same size / colour / style combination.',
        });
        return;
      }
      combos.add(key);
    }
  });

const productListQuery = listQuery.extend({
  categoryId: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  stockStatus: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK']).optional(),
});

const SORTABLE = {
  name: 'name',
  sku: 'sku',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  sellingPrice: 'sellingPrice',
  costPrice: 'costPrice',
};

productsRouter.get(
  '/',
  requirePermission('product:view'),
  asyncHandler(async (req, res) => {
    const query = parse(productListQuery, req.query);

    const where: Prisma.ProductWhereInput = {};
    if (query.categoryId) {
      // Selecting a parent category includes everything filed under it.
      const children = await prisma.category.findMany({
        where: { parentId: query.categoryId },
        select: { id: true },
      });
      where.categoryId = { in: [query.categoryId, ...children.map((c) => c.id)] };
    }
    if (query.brandId) where.brandId = query.brandId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) where.status = query.status;
    if (query.search) {
      const search = query.search;
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
        { variants: { some: { barcode: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        ...paginate(query),
        orderBy: orderBy(query.sortBy, query.sortDir, SORTABLE, 'createdAt'),
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          variants: {
            select: {
              id: true,
              sku: true,
              size: true,
              color: true,
              costPrice: true,
              sellingPrice: true,
              minStock: true,
              reorderLevel: true,
              isActive: true,
              inventory: { select: { quantity: true } },
            },
          },
        },
      }),
    ]);

    const rows = products.map((product) => {
      const totalStock = product.variants.reduce(
        (sum, variant) => sum + variant.inventory.reduce((s, i) => s + i.quantity, 0),
        0,
      );
      const costValue = product.variants.reduce(
        (sum, v) => sum + v.inventory.reduce((s, i) => s + i.quantity, 0) * num(v.costPrice),
        0,
      );
      const retailValue = product.variants.reduce(
        (sum, v) => sum + v.inventory.reduce((s, i) => s + i.quantity, 0) * num(v.sellingPrice),
        0,
      );
      const threshold = Math.max(product.minStock, product.reorderLevel);
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        imageUrl: product.imageUrl,
        status: product.status,
        category: product.category,
        brand: product.brand,
        supplier: product.supplier,
        costPrice: num(product.costPrice),
        sellingPrice: num(product.sellingPrice),
        variantCount: product.variants.length,
        totalStock,
        costValue: round2(costValue),
        retailValue: round2(retailValue),
        stockStatus: stockStatus({
          quantity: totalStock,
          minStock: threshold,
          maxStock: product.maxStock,
        }),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    const filtered = query.stockStatus
      ? rows.filter((row) => row.stockStatus === query.stockStatus)
      : rows;

    res.json({ data: filtered, meta: pageMeta(total, query) });
  }),
);

productsRouter.get(
  '/:id',
  requirePermission('product:view'),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
        brand: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        variants: {
          orderBy: [{ color: 'asc' }, { size: 'asc' }],
          include: {
            inventory: { include: { location: { select: { id: true, name: true, code: true } } } },
          },
        },
      },
    });
    if (!product) throw notFound('Product');

    const variantIds = product.variants.map((v) => v.id);

    const [movements, purchaseItems, saleItems, returnItems] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { variantId: { in: variantIds } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          variant: { select: { sku: true, size: true, color: true } },
          location: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.purchaseItem.findMany({
        where: { variantId: { in: variantIds } },
        orderBy: { purchase: { orderDate: 'desc' } },
        take: 20,
        include: {
          purchase: {
            select: {
              id: true,
              number: true,
              orderDate: true,
              status: true,
              supplier: { select: { name: true } },
            },
          },
          variant: { select: { sku: true, size: true, color: true } },
        },
      }),
      prisma.saleItem.findMany({
        where: { variantId: { in: variantIds } },
        orderBy: { sale: { saleDate: 'desc' } },
        take: 20,
        include: {
          sale: {
            select: {
              id: true,
              number: true,
              saleDate: true,
              status: true,
              customer: { select: { name: true } },
            },
          },
          variant: { select: { sku: true, size: true, color: true } },
        },
      }),
      prisma.returnItem.findMany({
        where: { variantId: { in: variantIds } },
        orderBy: { return: { returnDate: 'desc' } },
        take: 20,
        include: {
          return: { select: { id: true, number: true, returnDate: true, type: true } },
          variant: { select: { sku: true, size: true, color: true } },
        },
      }),
    ]);

    const variants = product.variants.map((variant) => {
      const totalStock = variant.inventory.reduce((sum, row) => sum + row.quantity, 0);
      const threshold = Math.max(
        variant.minStock || product.minStock,
        variant.reorderLevel || product.reorderLevel,
      );
      return {
        ...variant,
        costPrice: num(variant.costPrice),
        sellingPrice: num(variant.sellingPrice),
        totalStock,
        damaged: variant.inventory.reduce((sum, row) => sum + row.damaged, 0),
        stockStatus: stockStatus({ quantity: totalStock, minStock: threshold }),
        stockByLocation: variant.inventory.map((row) => ({
          locationId: row.locationId,
          location: row.location,
          quantity: row.quantity,
          reserved: row.reserved,
          damaged: row.damaged,
        })),
      };
    });

    const totalStock = variants.reduce((sum, v) => sum + v.totalStock, 0);
    const costValue = round2(variants.reduce((sum, v) => sum + v.totalStock * v.costPrice, 0));
    const retailValue = round2(variants.reduce((sum, v) => sum + v.totalStock * v.sellingPrice, 0));

    res.json({
      data: {
        ...product,
        costPrice: num(product.costPrice),
        sellingPrice: num(product.sellingPrice),
        wholesalePrice: product.wholesalePrice == null ? null : num(product.wholesalePrice),
        taxRate: num(product.taxRate),
        variants,
        totals: {
          totalStock,
          costValue,
          retailValue,
          potentialProfit: round2(retailValue - costValue),
        },
        movements,
        purchaseHistory: purchaseItems,
        salesHistory: saleItems,
        returns: returnItems,
      },
    });
  }),
);

/** Preview an auto-generated SKU without saving anything. */
productsRouter.post(
  '/generate-sku',
  requirePermission('product:view'),
  asyncHandler(async (req, res) => {
    const input = parse(
      z.object({
        productName: z.string().trim().max(160).optional(),
        categoryId: z.string().trim().optional(),
        color: z.string().trim().max(30).optional(),
        size: z.string().trim().max(30).optional(),
      }),
      req.body,
    );
    const settings = await getSettings();
    const category = input.categoryId
      ? await prisma.category.findUnique({ where: { id: input.categoryId }, select: { name: true } })
      : null;
    const sku = await generateUniqueSku(prisma, settings.inventory.skuFormat, {
      category: category?.name ?? null,
      productName: input.productName ?? null,
      color: input.color ?? null,
      size: input.size ?? null,
    });
    res.json({ data: { sku } });
  }),
);

async function assertSkusFree(skus: string[], ignoreVariantIds: string[] = []) {
  const unique = skus.filter(Boolean);
  const duplicatesInPayload = unique.filter((sku, index) => unique.indexOf(sku) !== index);
  if (duplicatesInPayload.length > 0) {
    throw badRequest(`SKU ${duplicatesInPayload[0]} is used more than once in this form.`);
  }
  const [products, variants] = await Promise.all([
    prisma.product.findMany({ where: { sku: { in: unique } }, select: { sku: true } }),
    prisma.productVariant.findMany({
      where: { sku: { in: unique }, id: { notIn: ignoreVariantIds.length ? ignoreVariantIds : ['-'] } },
      select: { sku: true },
    }),
  ]);
  const taken = [...products, ...variants][0];
  if (taken) throw conflict(`SKU ${taken.sku} is already in use. Please choose a different one.`);
}

productsRouter.post(
  '/',
  requirePermission('product:create'),
  asyncHandler(async (req, res) => {
    const input = parse(productInput, req.body);
    const settings = await getSettings();

    const category = input.categoryId
      ? await prisma.category.findUnique({ where: { id: input.categoryId }, select: { name: true } })
      : null;
    const brand = input.brandId
      ? await prisma.brand.findUnique({ where: { id: input.brandId }, select: { name: true } })
      : null;

    const product = await prisma.$transaction(async (tx) => {
      const productSku =
        input.sku?.trim() ||
        (await generateUniqueSku(tx, settings.inventory.skuFormat, {
          category: category?.name,
          productName: input.name,
          brand: brand?.name,
        }));

      const variantsData: Prisma.ProductVariantCreateWithoutProductInput[] = [];
      for (const variant of input.variants) {
        const sku =
          variant.sku?.trim() ||
          (await generateUniqueSku(tx, settings.inventory.skuFormat, {
            category: category?.name,
            productName: input.name,
            brand: brand?.name,
            color: variant.color,
            size: variant.size,
          }));
        const barcode =
          variant.barcode?.trim() ||
          (settings.inventory.autoGenerateBarcode ? await generateUniqueBarcode(tx) : null);
        variantsData.push({
          sku,
          barcode,
          size: variant.size ?? null,
          color: variant.color ?? null,
          style: variant.style ?? null,
          material: variant.material ?? null,
          fit: variant.fit ?? null,
          costPrice: new Prisma.Decimal(variant.costPrice),
          sellingPrice: new Prisma.Decimal(variant.sellingPrice),
          minStock: variant.minStock || settings.inventory.defaultMinStock,
          reorderLevel: variant.reorderLevel,
          isActive: variant.isActive,
        });
      }

      await assertSkusFree([productSku, ...variantsData.map((v) => v.sku)]);

      return tx.product.create({
        data: {
          name: input.name,
          sku: productSku,
          barcode: input.barcode?.trim() || null,
          description: input.description ?? null,
          categoryId: input.categoryId ?? null,
          brandId: input.brandId ?? null,
          supplierId: input.supplierId ?? null,
          imageUrl: input.imageUrl ?? null,
          images: input.images,
          costPrice: new Prisma.Decimal(input.costPrice),
          sellingPrice: new Prisma.Decimal(input.sellingPrice),
          wholesalePrice:
            input.wholesalePrice == null ? null : new Prisma.Decimal(input.wholesalePrice),
          taxRate: new Prisma.Decimal(input.taxRate),
          minStock: input.minStock || settings.inventory.defaultMinStock,
          maxStock: input.maxStock ?? null,
          reorderLevel: input.reorderLevel,
          status: input.status,
          variants: { create: variantsData },
        },
        include: { variants: true },
      });
    });

    await auditFromRequest(req, {
      action: 'product.created',
      entity: 'Product',
      entityId: product.id,
      after: { name: product.name, sku: product.sku, variants: product.variants.length },
    });
    res.status(201).json({ data: product });
  }),
);

productsRouter.put(
  '/:id',
  requirePermission('product:update'),
  asyncHandler(async (req, res) => {
    const input = parse(productInput, req.body);
    const before = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });
    if (!before) throw notFound('Product');

    const settings = await getSettings();
    const category = input.categoryId
      ? await prisma.category.findUnique({ where: { id: input.categoryId }, select: { name: true } })
      : null;

    const updated = await prisma.$transaction(async (tx) => {
      const keptIds = input.variants.map((v) => v.id).filter((id): id is string => Boolean(id));
      const removed = before.variants.filter((v) => !keptIds.includes(v.id));

      for (const variant of removed) {
        const stock = await tx.inventory.aggregate({
          where: { variantId: variant.id },
          _sum: { quantity: true },
        });
        const movements = await tx.stockMovement.count({ where: { variantId: variant.id } });
        if ((stock._sum.quantity ?? 0) > 0) {
          throw conflict(
            `Variant ${variant.sku} still holds ${stock._sum.quantity} units and cannot be removed. Adjust the stock to zero first.`,
          );
        }
        if (movements > 0) {
          // Keep the history: deactivate rather than destroy.
          await tx.productVariant.update({ where: { id: variant.id }, data: { isActive: false } });
        } else {
          await tx.productVariant.delete({ where: { id: variant.id } });
        }
      }

      for (const variant of input.variants) {
        const sku =
          variant.sku?.trim() ||
          (await generateUniqueSku(tx, settings.inventory.skuFormat, {
            category: category?.name,
            productName: input.name,
            color: variant.color,
            size: variant.size,
          }));
        const data = {
          sku,
          barcode: variant.barcode?.trim() || null,
          size: variant.size ?? null,
          color: variant.color ?? null,
          style: variant.style ?? null,
          material: variant.material ?? null,
          fit: variant.fit ?? null,
          costPrice: new Prisma.Decimal(variant.costPrice),
          sellingPrice: new Prisma.Decimal(variant.sellingPrice),
          minStock: variant.minStock,
          reorderLevel: variant.reorderLevel,
          isActive: variant.isActive,
        };
        if (variant.id) {
          await tx.productVariant.update({ where: { id: variant.id }, data });
        } else {
          const barcode =
            data.barcode ||
            (settings.inventory.autoGenerateBarcode ? await generateUniqueBarcode(tx) : null);
          await tx.productVariant.create({
            data: { ...data, barcode, productId: before.id },
          });
        }
      }

      return tx.product.update({
        where: { id: before.id },
        data: {
          name: input.name,
          sku: input.sku?.trim() || before.sku,
          barcode: input.barcode?.trim() || null,
          description: input.description ?? null,
          categoryId: input.categoryId ?? null,
          brandId: input.brandId ?? null,
          supplierId: input.supplierId ?? null,
          imageUrl: input.imageUrl ?? null,
          images: input.images,
          costPrice: new Prisma.Decimal(input.costPrice),
          sellingPrice: new Prisma.Decimal(input.sellingPrice),
          wholesalePrice:
            input.wholesalePrice == null ? null : new Prisma.Decimal(input.wholesalePrice),
          taxRate: new Prisma.Decimal(input.taxRate),
          minStock: input.minStock,
          maxStock: input.maxStock ?? null,
          reorderLevel: input.reorderLevel,
          status: input.status,
        },
        include: { variants: true },
      });
    });

    await auditFromRequest(req, {
      action: 'product.updated',
      entity: 'Product',
      entityId: updated.id,
      before: { name: before.name, sku: before.sku, status: before.status },
      after: { name: updated.name, sku: updated.sku, status: updated.status },
    });
    res.json({ data: updated });
  }),
);

productsRouter.delete(
  '/:id',
  requirePermission('product:delete'),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { variants: { select: { id: true } } },
    });
    if (!product) throw notFound('Product');

    const variantIds = product.variants.map((v) => v.id);
    const [stock, movements] = await Promise.all([
      prisma.inventory.aggregate({ where: { variantId: { in: variantIds } }, _sum: { quantity: true } }),
      prisma.stockMovement.count({ where: { variantId: { in: variantIds } } }),
    ]);

    if ((stock._sum.quantity ?? 0) > 0) {
      throw conflict(
        `${product.name} still has ${stock._sum.quantity} units in stock. Clear the stock before deleting it.`,
      );
    }
    if (movements > 0) {
      // Rule 10/11: never destroy records that financial history depends on.
      const discontinued = await prisma.product.update({
        where: { id: product.id },
        data: { status: ProductStatus.DISCONTINUED },
      });
      await auditFromRequest(req, {
        action: 'product.discontinued',
        entity: 'Product',
        entityId: product.id,
        before: { status: product.status },
        after: { status: discontinued.status },
      });
      res.json({
        ok: true,
        discontinued: true,
        message: `${product.name} has stock history, so it was marked as discontinued instead of deleted. Its records stay auditable.`,
      });
      return;
    }

    await prisma.product.delete({ where: { id: product.id } });
    await auditFromRequest(req, {
      action: 'product.deleted',
      entity: 'Product',
      entityId: product.id,
      before: { name: product.name, sku: product.sku },
    });
    res.json({ ok: true, discontinued: false });
  }),
);
