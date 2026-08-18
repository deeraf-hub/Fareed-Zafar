import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { nonEmpty, optionalText, parse } from '../lib/validate.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';
import { auditFromRequest } from '../services/audit.js';

export const categoriesRouter = Router();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const categoryInput = z.object({
  name: nonEmpty('Category name', 80),
  description: optionalText(500),
  parentId: z.string().trim().min(1).nullish(),
  isActive: z.coerce.boolean().default(true),
});

categoriesRouter.get(
  '/',
  requirePermission('product:view'),
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });
    res.json({ data: categories });
  }),
);

categoriesRouter.get(
  '/tree',
  requirePermission('product:view'),
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    const roots = categories.filter((c) => !c.parentId);
    res.json({
      data: roots.map((root) => ({
        ...root,
        children: categories.filter((c) => c.parentId === root.id),
      })),
    });
  }),
);

categoriesRouter.post(
  '/',
  requirePermission('category:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(categoryInput, req.body);
    if (input.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent) throw notFound('Parent category');
      if (parent.parentId) throw badRequest('Categories can only be nested one level deep.');
    }
    let slug = slugify(input.name);
    const clash = await prisma.category.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        isActive: input.isActive,
      },
    });
    await auditFromRequest(req, {
      action: 'category.created',
      entity: 'Category',
      entityId: category.id,
      after: category,
    });
    res.status(201).json({ data: category });
  }),
);

categoriesRouter.put(
  '/:id',
  requirePermission('category:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(categoryInput.partial(), req.body);
    const before = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!before) throw notFound('Category');
    if (input.parentId && input.parentId === req.params.id) {
      throw badRequest('A category cannot be its own parent.');
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name: input.name,
        description: input.description,
        parentId: input.parentId === undefined ? undefined : input.parentId,
        isActive: input.isActive,
      },
    });
    await auditFromRequest(req, {
      action: 'category.updated',
      entity: 'Category',
      entityId: category.id,
      before,
      after: category,
    });
    res.json({ data: category });
  }),
);

categoriesRouter.delete(
  '/:id',
  requirePermission('category:manage'),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) throw notFound('Category');
    if (category._count.products > 0) {
      throw conflict(
        `${category.name} still has ${category._count.products} product(s). Move or delete them first, or deactivate the category instead.`,
      );
    }
    if (category._count.children > 0) {
      throw conflict(`${category.name} still has subcategories. Remove them first.`);
    }
    await prisma.category.delete({ where: { id: category.id } });
    await auditFromRequest(req, {
      action: 'category.deleted',
      entity: 'Category',
      entityId: category.id,
      before: category,
    });
    res.json({ ok: true });
  }),
);
