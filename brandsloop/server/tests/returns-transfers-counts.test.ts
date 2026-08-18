import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { asRole } from './api.js';
import { createLocation, createProduct, giveStock, resetDatabase, stockAt } from './helpers.js';

describe('returns', () => {
  beforeEach(resetDatabase);

  it('puts a resellable customer return back into stock', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 10);

    const sale = await agent
      .post('/api/sales')
      .send({ locationId: location.id, items: [{ variantId: variant.id, quantity: 3, unitPrice: 2000 }] })
      .expect(201);
    expect(await stockAt(variant.id, location.id)).toBe(7);

    await agent
      .post('/api/returns')
      .send({
        type: 'CUSTOMER',
        saleId: sale.body.data.id,
        locationId: location.id,
        reason: 'Size did not fit',
        items: [{ variantId: variant.id, quantity: 1, condition: 'RESELLABLE', unitPrice: 2000 }],
      })
      .expect(201);

    expect(await stockAt(variant.id, location.id)).toBe(8);
  });

  it('keeps a damaged customer return out of sellable stock', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 10);

    const sale = await agent
      .post('/api/sales')
      .send({ locationId: location.id, items: [{ variantId: variant.id, quantity: 2, unitPrice: 2000 }] })
      .expect(201);

    await agent
      .post('/api/returns')
      .send({
        type: 'CUSTOMER',
        saleId: sale.body.data.id,
        locationId: location.id,
        items: [{ variantId: variant.id, quantity: 1, condition: 'DAMAGED', unitPrice: 0 }],
      })
      .expect(201);

    const row = await prisma.inventory.findUniqueOrThrow({
      where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
    });
    expect(row.quantity).toBe(8);
    expect(row.damaged).toBe(1);
  });

  it('will not accept back more than was sold', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 10);

    const sale = await agent
      .post('/api/sales')
      .send({ locationId: location.id, items: [{ variantId: variant.id, quantity: 2, unitPrice: 2000 }] })
      .expect(201);

    const response = await agent
      .post('/api/returns')
      .send({
        type: 'CUSTOMER',
        saleId: sale.body.data.id,
        locationId: location.id,
        items: [{ variantId: variant.id, quantity: 3, condition: 'RESELLABLE', unitPrice: 2000 }],
      })
      .expect(400);
    expect(response.body.error.message).toMatch(/at most 2/i);
  });

  it('takes stock out for a supplier return', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const supplier = await prisma.supplier.create({ data: { name: 'Karachi Denim House' } });
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 10);

    await agent
      .post('/api/returns')
      .send({
        type: 'SUPPLIER',
        supplierId: supplier.id,
        locationId: location.id,
        reason: 'Faulty batch',
        items: [{ variantId: variant.id, quantity: 4, unitPrice: 1200 }],
      })
      .expect(201);

    expect(await stockAt(variant.id, location.id)).toBe(6);
  });
});

describe('stock transfers', () => {
  beforeEach(resetDatabase);

  it('moves stock between locations with paired movements', async () => {
    const { agent } = await asRole('ADMIN');
    const warehouse = await createLocation('Warehouse', 'WH');
    const store = await createLocation('Main Store', 'MAIN');
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, warehouse.id, 25);
    await giveStock(variant.id, store.id, 10);

    await agent
      .post('/api/stock-transfers')
      .send({
        fromLocationId: warehouse.id,
        toLocationId: store.id,
        items: [{ variantId: variant.id, quantity: 10 }],
      })
      .expect(201);

    expect(await stockAt(variant.id, warehouse.id)).toBe(15);
    expect(await stockAt(variant.id, store.id)).toBe(20);

    const out = await prisma.stockMovement.findFirstOrThrow({ where: { type: 'TRANSFER_OUT' } });
    const incoming = await prisma.stockMovement.findFirstOrThrow({ where: { type: 'TRANSFER_IN' } });
    expect(out.quantity).toBe(-10);
    expect(incoming.quantity).toBe(10);
  });

  it('refuses a transfer larger than the source stock', async () => {
    const { agent } = await asRole('ADMIN');
    const warehouse = await createLocation('Warehouse', 'WH');
    const store = await createLocation('Main Store', 'MAIN');
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, warehouse.id, 3);

    const response = await agent
      .post('/api/stock-transfers')
      .send({
        fromLocationId: warehouse.id,
        toLocationId: store.id,
        items: [{ variantId: variant.id, quantity: 5 }],
      })
      .expect(409);

    expect(response.body.error.message).toMatch(/Not enough stock/i);
    expect(await stockAt(variant.id, warehouse.id)).toBe(3);
    expect(await stockAt(variant.id, store.id)).toBe(0);
  });

  it('refuses a transfer to the same location', async () => {
    const { agent } = await asRole('ADMIN');
    const warehouse = await createLocation('Warehouse', 'WH');
    const product = await createProduct();
    const response = await agent
      .post('/api/stock-transfers')
      .send({
        fromLocationId: warehouse.id,
        toLocationId: warehouse.id,
        items: [{ variantId: product.variants[0]!.id, quantity: 1 }],
      })
      .expect(400);
    expect(response.body.error.message).toMatch(/must be different/i);
  });
});

describe('stock adjustments', () => {
  beforeEach(resetDatabase);

  it('adjusts to a new level and records the reason', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 20);

    await agent
      .post('/api/stock-adjustments')
      .send({
        locationId: location.id,
        reason: 'COUNTING_ERROR',
        notes: 'Shelf recount',
        items: [{ variantId: variant.id, newQty: 18 }],
      })
      .expect(201);

    expect(await stockAt(variant.id, location.id)).toBe(18);
    const item = await prisma.stockAdjustmentItem.findFirstOrThrow();
    expect(item).toMatchObject({ previousQty: 20, newQty: 18, difference: -2 });
  });

  it('requires a reason', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    const response = await agent
      .post('/api/stock-adjustments')
      .send({
        locationId: location.id,
        items: [{ variantId: product.variants[0]!.id, newQty: 5 }],
      })
      .expect(400);
    expect(response.body.error.message).toMatch(/reason/i);
  });
});

describe('stock counts', () => {
  beforeEach(resetDatabase);

  it('applies differences only when the count is finalised', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 20);

    const count = await agent
      .post('/api/stock-counts')
      .send({ locationId: location.id, notes: 'Monthly count' })
      .expect(201);
    const countId = count.body.data.id;
    expect(count.body.data.items[0].systemQty).toBe(20);

    await agent
      .put(`/api/stock-counts/${countId}/items`)
      .send({ items: [{ variantId: variant.id, countedQty: 18 }] })
      .expect(200);

    // Saving the sheet must not move stock on its own.
    expect(await stockAt(variant.id, location.id)).toBe(20);

    const finalised = await agent
      .post(`/api/stock-counts/${countId}/finalize`)
      .send({ confirm: true })
      .expect(200);

    expect(finalised.body.message).toMatch(/1 item\(s\) adjusted/);
    expect(await stockAt(variant.id, location.id)).toBe(18);
    const movement = await prisma.stockMovement.findFirstOrThrow({ where: { type: 'STOCK_COUNT' } });
    expect(movement.quantity).toBe(-2);
  });

  it('cannot be finalised twice', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 10);

    const count = await agent.post('/api/stock-counts').send({ locationId: location.id }).expect(201);
    await agent
      .put(`/api/stock-counts/${count.body.data.id}/items`)
      .send({ items: [{ variantId: variant.id, countedQty: 9 }] })
      .expect(200);
    await agent.post(`/api/stock-counts/${count.body.data.id}/finalize`).send({ confirm: true }).expect(200);
    await agent.post(`/api/stock-counts/${count.body.data.id}/finalize`).send({ confirm: true }).expect(409);
    expect(await stockAt(variant.id, location.id)).toBe(9);
  });
});
