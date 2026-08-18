import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/db.js';
import { app, asRole } from './api.js';
import { createLocation, createProduct, giveStock, resetDatabase } from './helpers.js';
import { can, permissionsFor } from '../src/lib/permissions.js';
import { hashPassword } from '../src/auth/password.js';

describe('role permissions', () => {
  beforeEach(resetDatabase);

  it('rejects unauthenticated requests', async () => {
    await request(app).get('/api/products').expect(401);
    await request(app).get('/api/dashboard').expect(401);
  });

  it('lets staff record a sale but not delete a product', async () => {
    const { agent } = await asRole('STAFF');
    const location = await createLocation();
    const product = await createProduct();
    await giveStock(product.variants[0]!.id, location.id, 5);

    await agent
      .post('/api/sales')
      .send({ locationId: location.id, items: [{ variantId: product.variants[0]!.id, quantity: 1, unitPrice: 100 }] })
      .expect(201);

    const denied = await agent.delete(`/api/products/${product.id}`).expect(403);
    expect(denied.body.error.message).toMatch(/does not allow/i);
  });

  it('hides financial reports from staff and shows them to managers', async () => {
    const staff = await asRole('STAFF');
    await staff.agent.get('/api/reports/profit').expect(403);

    const manager = await asRole('MANAGER');
    await manager.agent.get('/api/reports/profit').expect(200);
  });

  it('only lets admins manage users and view audit logs', async () => {
    const manager = await asRole('MANAGER');
    await manager.agent.get('/api/users').expect(403);
    await manager.agent.get('/api/audit-logs').expect(403);

    const admin = await asRole('ADMIN');
    await admin.agent.get('/api/users').expect(200);
    await admin.agent.get('/api/audit-logs').expect(200);
  });

  it('omits cost and profit from a sale when a staff member opens it', async () => {
    const { agent: adminAgent } = await asRole('ADMIN');
    const location = await createLocation();
    const product = await createProduct({ cost: 1000, price: 2000 });
    await giveStock(product.variants[0]!.id, location.id, 5);
    const sale = await adminAgent
      .post('/api/sales')
      .send({ locationId: location.id, items: [{ variantId: product.variants[0]!.id, quantity: 1, unitPrice: 2000 }] })
      .expect(201);

    const adminView = await adminAgent.get(`/api/sales/${sale.body.data.id}`).expect(200);
    expect(adminView.body.data.profit).toBe(1000);

    const { agent: staffAgent } = await asRole('STAFF');
    const staffView = await staffAgent.get(`/api/sales/${sale.body.data.id}`).expect(200);
    expect(staffView.body.data.profit).toBeUndefined();
    expect(staffView.body.data.items[0].unitCost).toBeUndefined();
  });

  it('blocks a deactivated user immediately, without waiting for the token to expire', async () => {
    const { agent, user } = await asRole('MANAGER');
    await agent.get('/api/products').expect(200);
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    await agent.get('/api/products').expect(403);
  });

  it('gives each role the expected capability set', () => {
    expect(can('ADMIN', 'user:manage')).toBe(true);
    expect(can('MANAGER', 'user:manage')).toBe(false);
    expect(can('MANAGER', 'report:financial')).toBe(true);
    expect(can('STAFF', 'report:financial')).toBe(false);
    expect(can('STAFF', 'sale:create')).toBe(true);
    expect(can('STAFF', 'product:delete')).toBe(false);
    expect(permissionsFor('ADMIN').length).toBeGreaterThan(permissionsFor('MANAGER').length);
    expect(permissionsFor('MANAGER').length).toBeGreaterThan(permissionsFor('STAFF').length);
  });
});

describe('authentication', () => {
  beforeEach(resetDatabase);

  it('signs in with the right password and refuses the wrong one', async () => {
    await prisma.user.create({
      data: {
        email: 'owner@brandsloop.pk',
        name: 'Owner',
        role: 'ADMIN',
        passwordHash: await hashPassword('Password123'),
      },
    });

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@brandsloop.pk', password: 'Password123' })
      .expect(200);
    expect(ok.body.user.role).toBe('ADMIN');
    expect(ok.body.user.permissions).toContain('user:manage');
    // The hash must never leave the server.
    expect(JSON.stringify(ok.body)).not.toContain('$2');

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@brandsloop.pk', password: 'wrong' })
      .expect(401);
    // The same message for both cases, so accounts cannot be enumerated.
    expect(bad.body.error.message).toBe('Incorrect email or password.');

    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@brandsloop.pk', password: 'whatever' })
      .expect(401);
    expect(unknown.body.error.message).toBe('Incorrect email or password.');
  });
});
