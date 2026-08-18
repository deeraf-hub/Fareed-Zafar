import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { asRole } from './api.js';
import { createLocation, createProduct, resetDatabase, stockAt, giveStock } from './helpers.js';

async function setup() {
  const location = await createLocation();
  const supplier = await prisma.supplier.create({ data: { name: 'Lahore Textile Mills' } });
  const product = await createProduct({ cost: 1200, price: 2499 });
  return { location, supplier, variant: product.variants[0]!, product };
}

describe('purchases', () => {
  beforeEach(resetDatabase);

  it('increases stock when a purchase is received', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, supplier, variant } = await setup();
    await giveStock(variant.id, location.id, 10);

    const created = await agent
      .post('/api/purchases')
      .send({
        supplierId: supplier.id,
        locationId: location.id,
        items: [{ variantId: variant.id, quantity: 20, unitCost: 1200 }],
      })
      .expect(201);

    expect(created.body.data.total).toBe('24000');
    expect(await stockAt(variant.id, location.id)).toBe(10);

    const received = await agent
      .post(`/api/purchases/${created.body.data.id}/receive`)
      .send({ receiveAll: true })
      .expect(200);

    expect(received.body.data.status).toBe('RECEIVED');
    expect(await stockAt(variant.id, location.id)).toBe(30);

    const movement = await prisma.stockMovement.findFirstOrThrow({
      where: { type: 'PURCHASE', variantId: variant.id },
    });
    expect(movement).toMatchObject({ quantity: 20, previousQty: 10, newQty: 30 });
    expect(movement.referenceNumber).toBe(created.body.data.number);
  });

  it('supports partial receipts and reports the outstanding balance', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, supplier, variant } = await setup();

    const created = await agent
      .post('/api/purchases')
      .send({
        supplierId: supplier.id,
        locationId: location.id,
        items: [{ variantId: variant.id, quantity: 20, unitCost: 1000 }],
      })
      .expect(201);
    const itemId = created.body.data.items[0].id;

    const partial = await agent
      .post(`/api/purchases/${created.body.data.id}/receive`)
      .send({ items: [{ itemId, quantity: 8 }] })
      .expect(200);

    expect(partial.body.data.status).toBe('PARTIALLY_RECEIVED');
    expect(await stockAt(variant.id, location.id)).toBe(8);

    // Over-receiving the rest is refused.
    await agent
      .post(`/api/purchases/${created.body.data.id}/receive`)
      .send({ items: [{ itemId, quantity: 13 }] })
      .expect(400);

    const rest = await agent
      .post(`/api/purchases/${created.body.data.id}/receive`)
      .send({ receiveAll: true })
      .expect(200);
    expect(rest.body.data.status).toBe('RECEIVED');
    expect(await stockAt(variant.id, location.id)).toBe(20);
  });

  it('reverses received stock when a purchase is cancelled', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, supplier, variant } = await setup();

    const created = await agent
      .post('/api/purchases')
      .send({
        supplierId: supplier.id,
        locationId: location.id,
        status: 'RECEIVED',
        items: [{ variantId: variant.id, quantity: 15, unitCost: 1000 }],
      })
      .expect(201);

    expect(await stockAt(variant.id, location.id)).toBe(15);

    await agent.post(`/api/purchases/${created.body.data.id}/cancel`).send({}).expect(200);
    expect(await stockAt(variant.id, location.id)).toBe(0);

    const purchase = await prisma.purchase.findUniqueOrThrow({
      where: { id: created.body.data.id },
    });
    // The document survives cancellation so the history stays auditable.
    expect(purchase.status).toBe('CANCELLED');
  });

  it('rejects a purchase with no items', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, supplier } = await setup();
    const response = await agent
      .post('/api/purchases')
      .send({ supplierId: supplier.id, locationId: location.id, items: [] })
      .expect(400);
    expect(response.body.error.message).toMatch(/at least one product/i);
  });

  it('rejects paying more than the purchase total', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, supplier, variant } = await setup();
    const response = await agent
      .post('/api/purchases')
      .send({
        supplierId: supplier.id,
        locationId: location.id,
        paidAmount: 999_999,
        items: [{ variantId: variant.id, quantity: 1, unitCost: 100 }],
      })
      .expect(400);
    expect(response.body.error.message).toMatch(/more than the purchase total/i);
  });
});
