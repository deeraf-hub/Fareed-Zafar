import type { Role } from '@prisma/client';
import { prisma } from '../src/db.js';
import { hashPassword } from '../src/auth/password.js';
import { toDecimal } from '../src/lib/money.js';

/** Wipes every table between tests while keeping the schema in place. */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function createUser(role: Role = 'ADMIN', email = `${role.toLowerCase()}@test.pk`) {
  return prisma.user.create({
    data: {
      email,
      name: `${role} user`,
      role,
      passwordHash: await hashPassword('Password123'),
    },
  });
}

export async function createLocation(name = 'Main Store', code = 'MAIN') {
  return prisma.location.create({ data: { name, code, type: 'STORE' } });
}

interface ProductOptions {
  name?: string;
  sku?: string;
  cost?: number;
  price?: number;
  minStock?: number;
  reorderLevel?: number;
  variants?: { sku: string; size?: string; color?: string; cost?: number; price?: number }[];
}

export async function createProduct(options: ProductOptions = {}) {
  const cost = options.cost ?? 1000;
  const price = options.price ?? 2000;
  const variants = options.variants ?? [{ sku: 'TSH-BLK-M-001', size: 'M', color: 'Black' }];

  return prisma.product.create({
    data: {
      name: options.name ?? 'Test T-Shirt',
      sku: options.sku ?? 'TSH-001',
      costPrice: toDecimal(cost),
      sellingPrice: toDecimal(price),
      minStock: options.minStock ?? 0,
      reorderLevel: options.reorderLevel ?? 0,
      variants: {
        create: variants.map((variant) => ({
          sku: variant.sku,
          size: variant.size ?? null,
          color: variant.color ?? null,
          costPrice: toDecimal(variant.cost ?? cost),
          sellingPrice: toDecimal(variant.price ?? price),
        })),
      },
    },
    include: { variants: true },
  });
}

/** Seeds stock straight into a location via an opening-stock movement. */
export async function giveStock(variantId: string, locationId: string, quantity: number) {
  const { applyStockChange } = await import('../src/services/inventory.js');
  await prisma.$transaction(async (tx) => {
    await applyStockChange(tx, {
      variantId,
      locationId,
      delta: quantity,
      type: 'OPENING_STOCK',
      notes: 'test fixture',
    });
  });
}

export async function stockAt(variantId: string, locationId: string): Promise<number> {
  const row = await prisma.inventory.findUnique({
    where: { variantId_locationId: { variantId, locationId } },
    select: { quantity: true },
  });
  return row?.quantity ?? 0;
}
