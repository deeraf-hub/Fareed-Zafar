import { beforeEach, describe, expect, it } from 'vitest';
import { asRole } from './api.js';
import { createLocation, createProduct, giveStock, resetDatabase } from './helpers.js';
import { lineTotal, round2, sum } from '../src/lib/money.js';

describe('inventory valuation and money maths', () => {
  beforeEach(resetDatabase);

  it('values stock at cost and at retail', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct({
      cost: 1200,
      price: 2499,
      variants: [
        { sku: 'TSH-BLK-M-001', size: 'M', color: 'Black' },
        { sku: 'TSH-BLK-L-001', size: 'L', color: 'Black' },
      ],
    });
    await giveStock(product.variants[0]!.id, location.id, 25);
    await giveStock(product.variants[1]!.id, location.id, 10);

    const response = await agent.get('/api/inventory/summary').expect(200);
    // 35 units x 1200 cost, x 2499 retail
    expect(response.body.data.totalUnits).toBe(35);
    expect(response.body.data.costValue).toBe(42000);
    expect(response.body.data.retailValue).toBe(87465);
    expect(response.body.data.potentialProfit).toBe(45465);
  });

  it('reports gross profit and margin from completed sales', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct({ cost: 1000, price: 2500 });
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 20);

    await agent
      .post('/api/sales')
      .send({ locationId: location.id, items: [{ variantId: variant.id, quantity: 4, unitPrice: 2500 }] })
      .expect(201);

    const report = await agent.get('/api/reports/profit?range=today').expect(200);
    expect(report.body.totals.revenue).toBe(10000);
    expect(report.body.totals.cost).toBe(4000);
    expect(report.body.totals.grossProfit).toBe(6000);
    expect(report.body.totals.margin).toBe(60);
  });

  it('applies discounts and tax consistently to a line', () => {
    expect(lineTotal({ unit: 2499, quantity: 2 })).toBe(4998);
    expect(lineTotal({ unit: 2499, quantity: 2, discount: 500 })).toBe(4498);
    expect(lineTotal({ unit: 1000, quantity: 3, discount: 100, tax: 150 })).toBe(3050);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(sum([1.005, 2.005])).toBe(3.01);
  });

  it('exports a report as CSV honouring the current filters', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct({ cost: 1200, price: 2499 });
    await giveStock(product.variants[0]!.id, location.id, 5);

    const response = await agent
      .get('/api/reports/inventory?format=csv')
      .expect(200)
      .expect('Content-Type', /text\/csv/);

    expect(response.headers['content-disposition']).toMatch(/brandsloop-inventory-report-/);
    expect(response.text).toContain('Product,SKU,Variant');
    expect(response.text).toContain('Test T-Shirt');
    expect(response.text).toContain('TSH-BLK-M-001');
  });
});
