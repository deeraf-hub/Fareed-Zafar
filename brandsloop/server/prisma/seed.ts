/**
 * Seeds a usable Brandsloop database.
 *
 * Always created: the admin account, business settings, stock locations,
 * categories and brands. Demo catalogue/transactions are added when
 * SEED_DEMO_DATA is not "false".
 *
 * The admin password is never hard-coded: it comes from SEED_ADMIN_PASSWORD,
 * or a strong random one is generated and printed once.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { seedDemoData } from './seed-demo.js';
import { prisma } from '../src/db.js';
import { hashPassword, passwordProblems } from '../src/auth/password.js';
import { DEFAULT_SETTINGS } from '../src/services/settings.js';

function generatePassword(): string {
  const raw = randomBytes(12).toString('base64url').replace(/[^A-Za-z0-9]/g, '');
  return `Bl${raw.slice(0, 12)}9`;
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@brandsloop.pk').toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? 'Brandsloop Admin';
  const provided = process.env.SEED_ADMIN_PASSWORD?.trim();

  if (provided) {
    const problems = passwordProblems(provided);
    if (problems.length > 0) {
      throw new Error(`SEED_ADMIN_PASSWORD must ${problems.join(', ')}.`);
    }
  }
  const password = provided || generatePassword();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`• Admin ${email} already exists — password left unchanged.`);
  } else {
    await prisma.user.create({
      data: { email, name, passwordHash: await hashPassword(password), role: 'ADMIN' },
    });
    console.log('\n──────────────────────────────────────────────');
    console.log('  Brandsloop admin account created');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    if (!provided) console.log('  (randomly generated — store it now, it is not shown again)');
    console.log('──────────────────────────────────────────────\n');
  }

  await prisma.setting.upsert({
    where: { key: 'app' },
    create: { key: 'app', value: DEFAULT_SETTINGS as unknown as object },
    update: {},
  });

  const locations = [
    { name: 'Main Store', code: 'MAIN', type: 'STORE' as const, isDefault: true, city: 'Lahore' },
    { name: 'Warehouse', code: 'WH', type: 'WAREHOUSE' as const, isDefault: false, city: 'Lahore' },
    { name: 'Outlet', code: 'OUT', type: 'OUTLET' as const, isDefault: false, city: 'Karachi' },
    { name: 'Online Warehouse', code: 'ONL', type: 'ONLINE' as const, isDefault: false, city: 'Lahore' },
  ];
  for (const location of locations) {
    await prisma.location.upsert({
      where: { code: location.code },
      create: location,
      update: {},
    });
  }

  const categories = [
    { name: 'Jeans', slug: 'jeans' },
    { name: 'T-Shirts', slug: 't-shirts' },
    { name: 'Shirts', slug: 'shirts' },
    { name: 'Trousers', slug: 'trousers' },
    { name: 'Caps', slug: 'caps' },
    { name: 'Bags', slug: 'bags' },
    { name: 'Jackets', slug: 'jackets' },
    { name: 'Hoodies', slug: 'hoodies' },
    { name: 'Shorts', slug: 'shorts' },
    { name: 'Sweatshirts', slug: 'sweatshirts' },
    { name: 'Accessories', slug: 'accessories' },
  ];
  for (const category of categories) {
    await prisma.category.upsert({ where: { slug: category.slug }, create: category, update: {} });
  }

  const subcategories = [
    { name: 'Slim Fit Jeans', slug: 'slim-fit-jeans', parent: 'jeans' },
    { name: 'Straight Fit Jeans', slug: 'straight-fit-jeans', parent: 'jeans' },
    { name: 'Graphic Tees', slug: 'graphic-tees', parent: 't-shirts' },
    { name: 'Basic Tees', slug: 'basic-tees', parent: 't-shirts' },
    { name: 'Snapbacks', slug: 'snapbacks', parent: 'caps' },
    { name: 'Backpacks', slug: 'backpacks', parent: 'bags' },
  ];
  for (const sub of subcategories) {
    const parent = await prisma.category.findUnique({ where: { slug: sub.parent } });
    if (!parent) continue;
    await prisma.category.upsert({
      where: { slug: sub.slug },
      create: { name: sub.name, slug: sub.slug, parentId: parent.id },
      update: {},
    });
  }

  for (const brandName of ['Brandsloop Basics', 'Denim Co', 'Urban Thread', 'Northline', 'Kraft & Co']) {
    await prisma.brand.upsert({ where: { name: brandName }, create: { name: brandName }, update: {} });
  }

  console.log('• Locations, categories and brands ready.');

  if ((process.env.SEED_DEMO_DATA ?? 'true') !== 'false') {
    await seedDemoData();
  } else {
    console.log('• SEED_DEMO_DATA=false — skipping demo catalogue.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed complete.\n');
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
