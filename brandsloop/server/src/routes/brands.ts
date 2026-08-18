import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { nonEmpty, parse } from '../lib/validate.js';
import { conflict, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { auditFromRequest } from '../services/audit.js';

export const brandsRouter = Router();

const brandInput = z.object({
  name: nonEmpty('Brand name', 80),
  isActive: z.coerce.boolean().default(true),
});

brandsRouter.get(
  '/',
  requirePermission('product:view'),
  asyncHandler(async (_req, res) => {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({ data: brands });
  }),
);

brandsRouter.post(
  '/',
  requirePermission('brand:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(brandInput, req.body);
    const brand = await prisma.brand.create({ data: input });
    await auditFromRequest(req, { action: 'brand.created', entity: 'Brand', entityId: brand.id, after: brand });
    res.status(201).json({ data: brand });
  }),
);

brandsRouter.put(
  '/:id',
  requirePermission('brand:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(brandInput.partial(), req.body);
    const brand = await prisma.brand.update({ where: { id: req.params.id }, data: input });
    await auditFromRequest(req, { action: 'brand.updated', entity: 'Brand', entityId: brand.id, after: brand });
    res.json({ data: brand });
  }),
);

brandsRouter.delete(
  '/:id',
  requirePermission('brand:manage'),
  asyncHandler(async (req, res) => {
    const brand = await prisma.brand.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw notFound('Brand');
    if (brand._count.products > 0) {
      throw conflict(`${brand.name} is used by ${brand._count.products} product(s).`);
    }
    await prisma.brand.delete({ where: { id: brand.id } });
    await auditFromRequest(req, { action: 'brand.deleted', entity: 'Brand', entityId: brand.id, before: brand });
    res.json({ ok: true });
  }),
);
