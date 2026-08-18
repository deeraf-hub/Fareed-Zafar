import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { applyStockChange, stockStatus } from '../src/services/inventory.js';
import { createLocation, createProduct, giveStock, resetDatabase, stockAt } from './helpers.js';

describe('stock engine', () => {
  beforeEach(resetDatabase);

  it('records a movement for every stock change', async () => {
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;

    await prisma.$transaction((tx) =>
      applyStockChange(tx, {
        variantId: variant.id,
        locationId: location.id,
        delta: 20,
        type: 'PURCHASE',
        referenceNumber: 'PO-2026-0001',
      }),
    );

    const movements = await prisma.stockMovement.findMany({ where: { variantId: variant.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ quantity: 20, previousQty: 0, newQty: 20, type: 'PURCHASE' });
    expect(await stockAt(variant.id, location.id)).toBe(20);
  });

  it('refuses to drive stock negative', async () => {
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 5);

    await expect(
      prisma.$transaction((tx) =>
        applyStockChange(tx, {
          variantId: variant.id,
          locationId: location.id,
          delta: -6,
          type: 'SALE',
        }),
      ),
    ).rejects.toThrow(/Not enough stock/);

    expect(await stockAt(variant.id, location.id)).toBe(5);
    // The rejected attempt must leave no movement behind.
    expect(await prisma.stockMovement.count({ where: { type: 'SALE' } })).toBe(0);
  });

  it('keeps damaged units out of sellable stock', async () => {
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 10);

    await prisma.$transaction((tx) =>
      applyStockChange(tx, {
        variantId: variant.id,
        locationId: location.id,
        delta: 2,
        type: 'DAMAGED',
        toDamaged: true,
      }),
    );

    const row = await prisma.inventory.findUniqueOrThrow({
      where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
    });
    expect(row.quantity).toBe(10);
    expect(row.damaged).toBe(2);
  });

  it('classifies stock status against the higher of min stock and reorder level', () => {
    expect(stockStatus({ quantity: 0, minStock: 5 })).toBe('OUT_OF_STOCK');
    expect(stockStatus({ quantity: 3, minStock: 5 })).toBe('LOW_STOCK');
    expect(stockStatus({ quantity: 5, minStock: 5 })).toBe('LOW_STOCK');
    expect(stockStatus({ quantity: 4, minStock: 2, reorderLevel: 8 })).toBe('LOW_STOCK');
    expect(stockStatus({ quantity: 12, minStock: 5 })).toBe('IN_STOCK');
    expect(stockStatus({ quantity: 50, minStock: 5, maxStock: 40 })).toBe('OVERSTOCK');
    expect(stockStatus({ quantity: 1, minStock: 0, reorderLevel: 0 })).toBe('IN_STOCK');
  });
});
