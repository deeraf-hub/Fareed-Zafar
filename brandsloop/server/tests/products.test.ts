import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { asRole } from './api.js';
import { createProduct, giveStock, createLocation, resetDatabase } from './helpers.js';
import { renderSku, codeFrom } from '../src/services/sku.js';

describe('products and variants', () => {
  beforeEach(resetDatabase);

  it('creates a product with variants and auto-generated SKUs', async () => {
    const { agent } = await asRole('ADMIN');
    const category = await prisma.category.create({ data: { name: 'T-Shirts', slug: 't-shirts' } });

    const response = await agent
      .post('/api/products')
      .send({
        name: 'Basic T-Shirt',
        categoryId: category.id,
        costPrice: 1200,
        sellingPrice: 2499,
        variants: [
          { size: 'S', color: 'Black', costPrice: 1200, sellingPrice: 2499 },
          { size: 'M', color: 'Black', costPrice: 1200, sellingPrice: 2499 },
          { size: 'M', color: 'White', costPrice: 1200, sellingPrice: 2499 },
        ],
      })
      .expect(201);

    const skus = response.body.data.variants.map((v: { sku: string }) => v.sku);
    expect(skus).toEqual(['TSH-BLK-S-001', 'TSH-BLK-M-001', 'TSH-WHT-M-001']);
    expect(new Set(skus).size).toBe(3);
    expect(response.body.data.variants.every((v: { barcode: string }) => v.barcode)).toBe(true);
  });

  it('rejects a duplicate SKU', async () => {
    const { agent } = await asRole('ADMIN');
    await createProduct({ sku: 'TSH-001', variants: [{ sku: 'TSH-BLK-M-001' }] });

    const response = await agent
      .post('/api/products')
      .send({
        name: 'Another Tee',
        sku: 'TSH-001',
        costPrice: 100,
        sellingPrice: 200,
        variants: [{ sku: 'NEW-001', costPrice: 100, sellingPrice: 200 }],
      })
      .expect(409);

    expect(response.body.error.message).toMatch(/already in use/i);
  });

  it('rejects two variants with the same size and colour', async () => {
    const { agent } = await asRole('ADMIN');
    const response = await agent
      .post('/api/products')
      .send({
        name: 'Duplicate variants',
        costPrice: 100,
        sellingPrice: 200,
        variants: [
          { size: 'M', color: 'Black', costPrice: 100, sellingPrice: 200 },
          { size: 'M', color: 'Black', costPrice: 100, sellingPrice: 200 },
        ],
      })
      .expect(400);
    expect(response.body.error.message).toMatch(/same size/i);
  });

  it('rejects a product with no name', async () => {
    const { agent } = await asRole('ADMIN');
    const response = await agent
      .post('/api/products')
      .send({ name: '   ', costPrice: 10, sellingPrice: 20, variants: [] })
      .expect(400);
    expect(response.body.error.message).toMatch(/Product name is required/i);
  });

  it('rejects a negative price', async () => {
    const { agent } = await asRole('ADMIN');
    const response = await agent
      .post('/api/products')
      .send({ name: 'Bad price', costPrice: -5, sellingPrice: 20, variants: [] })
      .expect(400);
    expect(response.body.error.message).toMatch(/cannot be negative/i);
  });

  it('discontinues rather than deletes a product that has stock history', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    const variant = product.variants[0]!;
    await giveStock(variant.id, location.id, 5);
    // Take the stock back to zero so only the movement history remains.
    await prisma.$transaction(async (tx) => {
      const { applyStockChange } = await import('../src/services/inventory.js');
      await applyStockChange(tx, {
        variantId: variant.id,
        locationId: location.id,
        delta: -5,
        type: 'ADJUSTMENT',
      });
    });

    const response = await agent.delete(`/api/products/${product.id}`).expect(200);
    expect(response.body.discontinued).toBe(true);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.status).toBe('DISCONTINUED');
  });

  it('blocks deleting a product that still holds stock', async () => {
    const { agent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct();
    await giveStock(product.variants[0]!.id, location.id, 4);

    const response = await agent.delete(`/api/products/${product.id}`).expect(409);
    expect(response.body.error.message).toMatch(/still has 4 units/i);
  });

  it('builds retail-style SKU codes', () => {
    expect(codeFrom('Black')).toBe('BLK');
    expect(codeFrom('T-Shirts')).toBe('TSH');
    expect(renderSku('{CAT}-{COLOR}-{SIZE}-{SEQ}', { category: 'Jeans', color: 'Blue', size: '32' }, 1))
      .toBe('JNS-BLU-32-001');
    // Empty tokens collapse instead of leaving a dangling separator.
    expect(renderSku('{CAT}-{COLOR}-{SIZE}-{SEQ}', { category: 'Caps', color: 'Black' }, 1))
      .toBe('CAP-BLK-001');
  });
});
