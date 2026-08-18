import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { asRole } from './api.js';
import { createLocation, createProduct, giveStock, resetDatabase, stockAt } from './helpers.js';

async function setup() {
  const location = await createLocation();
  const customer = await prisma.customer.create({ data: { name: 'Ali Hamza' } });
  const product = await createProduct({ cost: 1200, price: 2499 });
  return { location, customer, variant: product.variants[0]! };
}

describe('sales', () => {
  beforeEach(resetDatabase);

  it('reduces stock when a sale is completed', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, customer, variant } = await setup();
    await giveStock(variant.id, location.id, 20);

    const response = await agent
      .post('/api/sales')
      .send({
        customerId: customer.id,
        locationId: location.id,
        paymentMethod: 'CASH',
        paidAmount: 7497,
        items: [{ variantId: variant.id, quantity: 3, unitPrice: 2499 }],
      })
      .expect(201);

    expect(response.body.data.total).toBe('7497');
    expect(response.body.data.paymentStatus).toBe('PAID');
    expect(await stockAt(variant.id, location.id)).toBe(17);

    const movement = await prisma.stockMovement.findFirstOrThrow({ where: { type: 'SALE' } });
    expect(movement).toMatchObject({ quantity: -3, previousQty: 20, newQty: 17 });
  });

  it('refuses to sell more than is in stock', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, variant } = await setup();
    await giveStock(variant.id, location.id, 2);

    const response = await agent
      .post('/api/sales')
      .send({
        locationId: location.id,
        items: [{ variantId: variant.id, quantity: 5, unitPrice: 2499 }],
      })
      .expect(409);

    expect(response.body.error.message).toMatch(/Not enough stock/i);
    // The whole transaction rolls back: no sale, no stock change.
    expect(await stockAt(variant.id, location.id)).toBe(2);
    expect(await prisma.sale.count()).toBe(0);
  });

  it('freezes the cost price at the time of sale for profit reporting', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, variant } = await setup();
    await giveStock(variant.id, location.id, 10);

    await agent
      .post('/api/sales')
      .send({ locationId: location.id, items: [{ variantId: variant.id, quantity: 1, unitPrice: 2499 }] })
      .expect(201);

    // A later cost change must not rewrite the historical margin.
    await prisma.productVariant.update({ where: { id: variant.id }, data: { costPrice: 9999 } });

    const item = await prisma.saleItem.findFirstOrThrow();
    expect(Number(item.unitCost)).toBe(1200);
  });

  it('returns stock when a completed sale is cancelled', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, variant } = await setup();
    await giveStock(variant.id, location.id, 10);

    const sale = await agent
      .post('/api/sales')
      .send({ locationId: location.id, items: [{ variantId: variant.id, quantity: 4, unitPrice: 2499 }] })
      .expect(201);
    expect(await stockAt(variant.id, location.id)).toBe(6);

    await agent.post(`/api/sales/${sale.body.data.id}/cancel`).send({}).expect(200);
    expect(await stockAt(variant.id, location.id)).toBe(10);
    const cancelled = await prisma.sale.findUniqueOrThrow({ where: { id: sale.body.data.id } });
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('does not touch stock for a draft sale until it is completed', async () => {
    const { agent } = await asRole('ADMIN');
    const { location, variant } = await setup();
    await giveStock(variant.id, location.id, 10);

    const draft = await agent
      .post('/api/sales')
      .send({
        locationId: location.id,
        status: 'DRAFT',
        items: [{ variantId: variant.id, quantity: 2, unitPrice: 2499 }],
      })
      .expect(201);
    expect(await stockAt(variant.id, location.id)).toBe(10);

    await agent.post(`/api/sales/${draft.body.data.id}/complete`).send({}).expect(200);
    expect(await stockAt(variant.id, location.id)).toBe(8);
  });

  it('rejects a sale with no items', async () => {
    const { agent } = await asRole('ADMIN');
    const { location } = await setup();
    const response = await agent.post('/api/sales').send({ locationId: location.id, items: [] }).expect(400);
    expect(response.body.error.message).toMatch(/at least one product/i);
  });
});
