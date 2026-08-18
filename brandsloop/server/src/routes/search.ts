import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { can } from '../lib/permissions.js';
import { num } from '../lib/money.js';

export const searchRouter = Router();

/**
 * Global command-bar search. Every branch is capped and permission-checked, so
 * a staff member never sees supplier or purchase records they cannot open.
 */
searchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = parse(z.object({ q: z.string().trim().min(1).max(120) }), req.query);
    const role = req.user!.role;
    const like = { contains: q, mode: 'insensitive' as const };

    const [products, variants, categories, suppliers, customers, sales, purchases] =
      await Promise.all([
        can(role, 'product:view')
          ? prisma.product.findMany({
              where: { OR: [{ name: like }, { sku: like }, { barcode: like }] },
              take: 6,
              select: { id: true, name: true, sku: true, imageUrl: true },
            })
          : [],
        can(role, 'product:view')
          ? prisma.productVariant.findMany({
              where: { OR: [{ sku: like }, { barcode: like }] },
              take: 6,
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
                sellingPrice: true,
                product: { select: { id: true, name: true } },
                inventory: { select: { quantity: true } },
              },
            })
          : [],
        can(role, 'product:view')
          ? prisma.category.findMany({ where: { name: like }, take: 4, select: { id: true, name: true } })
          : [],
        can(role, 'supplier:view')
          ? prisma.supplier.findMany({
              where: { OR: [{ name: like }, { phone: like }, { email: like }] },
              take: 4,
              select: { id: true, name: true, phone: true },
            })
          : [],
        can(role, 'customer:view')
          ? prisma.customer.findMany({
              where: { OR: [{ name: like }, { phone: like }] },
              take: 4,
              select: { id: true, name: true, phone: true },
            })
          : [],
        can(role, 'sale:view')
          ? prisma.sale.findMany({
              where: { number: like },
              take: 4,
              select: { id: true, number: true, total: true, saleDate: true },
            })
          : [],
        can(role, 'purchase:view')
          ? prisma.purchase.findMany({
              where: { number: like },
              take: 4,
              select: { id: true, number: true, total: true, orderDate: true },
            })
          : [],
      ]);

    res.json({
      data: {
        products: products.map((p) => ({ ...p, href: `/products/${p.id}` })),
        variants: variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          label: `${v.product.name} — ${[v.color, v.size].filter(Boolean).join(' / ')}`,
          sellingPrice: num(v.sellingPrice),
          stock: v.inventory.reduce((sum, row) => sum + row.quantity, 0),
          href: `/products/${v.product.id}`,
        })),
        categories: categories.map((c) => ({ ...c, href: `/categories` })),
        suppliers: suppliers.map((s) => ({ ...s, href: `/suppliers/${s.id}` })),
        customers: customers.map((c) => ({ ...c, href: `/customers` })),
        sales: sales.map((s) => ({ ...s, total: num(s.total), href: `/sales/${s.id}` })),
        purchases: purchases.map((p) => ({ ...p, total: num(p.total), href: `/purchases/${p.id}` })),
      },
    });
  }),
);
