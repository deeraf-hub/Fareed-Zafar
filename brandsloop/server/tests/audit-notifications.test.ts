import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { asRole } from './api.js';
import { createLocation, createProduct, giveStock, resetDatabase } from './helpers.js';
import { refreshStockAlerts } from '../src/services/notifications.js';

describe('audit log', () => {
  beforeEach(resetDatabase);

  it('records who changed what', async () => {
    const { agent, user } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    await giveStock(product.variants[0]!.id, location.id, 10);

    await agent
      .post('/api/stock-adjustments')
      .send({
        locationId: location.id,
        reason: 'DAMAGED',
        items: [{ variantId: product.variants[0]!.id, newQty: 8 }],
      })
      .expect(201);

    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: 'stock.adjusted' } });
    expect(log.userId).toBe(user.id);
    expect(log.entity).toBe('StockAdjustment');
    expect(JSON.stringify(log.after)).toContain('"from":10');
    expect(JSON.stringify(log.after)).toContain('"to":8');
  });

  it('is visible to admins through the API', async () => {
    const { agent } = await asRole('ADMIN');
    await createProduct();
    await agent.post('/api/brands').send({ name: 'Denim Co' }).expect(201);

    const response = await agent.get('/api/audit-logs?entity=Brand').expect(200);
    expect(response.body.data[0].action).toBe('brand.created');
    expect(response.body.data[0].user.role).toBe('ADMIN');
  });
});

describe('low stock alerts', () => {
  beforeEach(resetDatabase);

  it('raises a low-stock alert and clears it once restocked', async () => {
    const location = await createLocation();
    const product = await createProduct({ minStock: 5, reorderLevel: 8 });
    const variant = product.variants[0]!;
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { minStock: 5, reorderLevel: 8 },
    });

    await giveStock(variant.id, location.id, 4);
    await refreshStockAlerts([variant.id]);
    const low = await prisma.notification.findFirstOrThrow({ where: { type: 'LOW_STOCK' } });
    expect(low.message).toMatch(/down to 4/);

    await giveStock(variant.id, location.id, 40);
    await refreshStockAlerts([variant.id]);
    expect(await prisma.notification.count({ where: { type: 'LOW_STOCK' } })).toBe(0);
  });

  it('replaces the low-stock alert with an out-of-stock alert at zero', async () => {
    const location = await createLocation();
    const product = await createProduct({ minStock: 5 });
    const variant = product.variants[0]!;
    await prisma.productVariant.update({ where: { id: variant.id }, data: { minStock: 5 } });

    await giveStock(variant.id, location.id, 2);
    await refreshStockAlerts([variant.id]);
    expect(await prisma.notification.count({ where: { type: 'LOW_STOCK' } })).toBe(1);

    await prisma.$transaction(async (tx) => {
      const { applyStockChange } = await import('../src/services/inventory.js');
      await applyStockChange(tx, {
        variantId: variant.id,
        locationId: location.id,
        delta: -2,
        type: 'SALE',
      });
    });
    await refreshStockAlerts([variant.id]);

    expect(await prisma.notification.count({ where: { type: 'LOW_STOCK' } })).toBe(0);
    expect(await prisma.notification.count({ where: { type: 'OUT_OF_STOCK' } })).toBe(1);
  });
});

describe('barcode lookup', () => {
  beforeEach(resetDatabase);

  it('finds a variant by barcode and reports stock by location', async () => {
    const { agent } = await asRole('STAFF');
    const store = await createLocation('Main Store', 'MAIN');
    const warehouse = await createLocation('Warehouse', 'WH');
    const product = await createProduct();
    const variant = product.variants[0]!;
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { barcode: '1234567890128' },
    });
    await giveStock(variant.id, store.id, 10);
    await giveStock(variant.id, warehouse.id, 25);

    const response = await agent.get('/api/inventory/lookup/1234567890128').expect(200);
    expect(response.body.data.sku).toBe('TSH-BLK-M-001');
    expect(response.body.data.totalStock).toBe(35);
    expect(response.body.data.stockByLocation).toHaveLength(2);

    // The same endpoint accepts an SKU, so keyboard entry works too.
    const bySku = await agent.get('/api/inventory/lookup/TSH-BLK-M-001').expect(200);
    expect(bySku.body.data.variantId).toBe(variant.id);

    await agent.get('/api/inventory/lookup/does-not-exist').expect(404);
  });
});
