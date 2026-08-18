/**
 * Development / demo catalogue for Brandsloop.
 *
 * Everything here goes through the same stock engine the application uses, so
 * the demo database is internally consistent: every unit of stock traces back
 * to an opening balance, a received purchase, a sale, a return or an
 * adjustment.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../src/db.js';
import { applyStockChange } from '../src/services/inventory.js';
import { generateUniqueBarcode, generateUniqueSku } from '../src/services/sku.js';
import { nextNumber } from '../src/services/numbering.js';
import { lineTotal, round2, sum, toDecimal } from '../src/lib/money.js';
import { refreshStockAlerts } from '../src/services/notifications.js';
import { hashPassword } from '../src/auth/password.js';

const SKU_FORMAT = '{CAT}-{COLOR}-{SIZE}-{SEQ}';

/** Deterministic pseudo-random so repeated seeds produce comparable data. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}
const random = makeRandom(20260818);
const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)]!;
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(between(9, 19), between(0, 59), 0, 0);
  return date;
};

interface ProductSpec {
  name: string;
  categorySlug: string;
  brand: string;
  description: string;
  cost: number;
  price: number;
  wholesale: number;
  colors: string[];
  sizes: string[];
  minStock: number;
  reorderLevel: number;
  fit?: string;
  material?: string;
}

const CATALOGUE: ProductSpec[] = [
  {
    name: 'Basic T-Shirt',
    categorySlug: 'basic-tees',
    brand: 'Brandsloop Basics',
    description: 'Everyday combed-cotton crew neck. Pre-shrunk, holds shape after washing.',
    cost: 1200, price: 2499, wholesale: 1850,
    colors: ['Black', 'White', 'Navy'], sizes: ['S', 'M', 'L', 'XL'],
    minStock: 6, reorderLevel: 10, material: 'Cotton', fit: 'Regular',
  },
  {
    name: 'Graphic Print Tee',
    categorySlug: 'graphic-tees',
    brand: 'Urban Thread',
    description: 'Screen-printed front graphic on soft jersey cotton.',
    cost: 1450, price: 2999, wholesale: 2200,
    colors: ['Black', 'White'], sizes: ['S', 'M', 'L', 'XL'],
    minStock: 5, reorderLevel: 8, material: 'Cotton',
  },
  {
    name: 'Slim Fit Jeans',
    categorySlug: 'slim-fit-jeans',
    brand: 'Denim Co',
    description: 'Stretch denim with a tapered leg. Five-pocket styling.',
    cost: 2000, price: 3999, wholesale: 3100,
    colors: ['Blue', 'Black'], sizes: ['28', '30', '32', '34', '36'],
    minStock: 4, reorderLevel: 6, material: 'Denim', fit: 'Slim',
  },
  {
    name: 'Straight Fit Jeans',
    categorySlug: 'straight-fit-jeans',
    brand: 'Denim Co',
    description: 'Classic straight leg in rigid denim.',
    cost: 2100, price: 4299, wholesale: 3300,
    colors: ['Blue', 'Grey'], sizes: ['30', '32', '34', '36', '38'],
    minStock: 4, reorderLevel: 6, material: 'Denim', fit: 'Straight',
  },
  {
    name: 'Oxford Casual Shirt',
    categorySlug: 'shirts',
    brand: 'Northline',
    description: 'Button-down oxford weave, easy to iron.',
    cost: 1900, price: 3799, wholesale: 2900,
    colors: ['White', 'Blue'], sizes: ['S', 'M', 'L', 'XL'],
    minStock: 4, reorderLevel: 6, material: 'Cotton',
  },
  {
    name: 'Chino Trousers',
    categorySlug: 'trousers',
    brand: 'Northline',
    description: 'Mid-rise cotton twill chinos with a clean finish.',
    cost: 2200, price: 4499, wholesale: 3400,
    colors: ['Beige', 'Navy', 'Olive'], sizes: ['30', '32', '34', '36'],
    minStock: 4, reorderLevel: 6, material: 'Twill', fit: 'Slim',
  },
  {
    name: 'Snapback Cap',
    categorySlug: 'snapbacks',
    brand: 'Urban Thread',
    description: 'Structured six-panel cap with an adjustable snap closure.',
    cost: 600, price: 1499, wholesale: 1050,
    colors: ['Black', 'Navy'], sizes: [],
    minStock: 8, reorderLevel: 12,
  },
  {
    name: 'Canvas Backpack',
    categorySlug: 'backpacks',
    brand: 'Kraft & Co',
    description: 'Water-resistant canvas backpack with a padded laptop sleeve.',
    cost: 2600, price: 5499, wholesale: 4200,
    colors: ['Black', 'Olive'], sizes: [],
    minStock: 3, reorderLevel: 5, material: 'Canvas',
  },
  {
    name: 'Puffer Jacket',
    categorySlug: 'jackets',
    brand: 'Northline',
    description: 'Lightweight quilted puffer with a full-length zip.',
    cost: 4200, price: 8999, wholesale: 6800,
    colors: ['Black', 'Navy'], sizes: ['M', 'L', 'XL'],
    minStock: 3, reorderLevel: 4,
  },
  {
    name: 'Pullover Hoodie',
    categorySlug: 'hoodies',
    brand: 'Brandsloop Basics',
    description: 'Brushed-back fleece hoodie with a kangaroo pocket.',
    cost: 2400, price: 4999, wholesale: 3800,
    colors: ['Black', 'Grey', 'Maroon'], sizes: ['S', 'M', 'L', 'XL'],
    minStock: 5, reorderLevel: 8, material: 'Fleece',
  },
  {
    name: 'Jersey Shorts',
    categorySlug: 'shorts',
    brand: 'Brandsloop Basics',
    description: 'Lightweight jersey shorts with an elasticated drawcord waist.',
    cost: 950, price: 1999, wholesale: 1500,
    colors: ['Black', 'Grey'], sizes: ['S', 'M', 'L', 'XL'],
    minStock: 6, reorderLevel: 10,
  },
  {
    name: 'Crew Sweatshirt',
    categorySlug: 'sweatshirts',
    brand: 'Urban Thread',
    description: 'Heavyweight crew-neck sweatshirt with ribbed cuffs.',
    cost: 2100, price: 4299, wholesale: 3300,
    colors: ['Grey', 'Navy'], sizes: ['M', 'L', 'XL'],
    minStock: 4, reorderLevel: 6,
  },
  {
    name: 'Leather Belt',
    categorySlug: 'accessories',
    brand: 'Kraft & Co',
    description: 'Full-grain leather belt with a brushed metal buckle.',
    cost: 900, price: 2199, wholesale: 1600,
    colors: ['Black', 'Brown'], sizes: ['32', '34', '36'],
    minStock: 5, reorderLevel: 8, material: 'Leather',
  },
];

const SUPPLIERS = [
  { name: 'Lahore Textile Mills', contactPerson: 'Imran Sheikh', phone: '+92 300 4412233', email: 'sales@lahoretextile.pk', city: 'Lahore', address: 'Plot 42, Sundar Industrial Estate', taxNumber: 'NTN-3345671' },
  { name: 'Karachi Denim House', contactPerson: 'Sana Qureshi', phone: '+92 321 7788990', email: 'orders@karachidenim.pk', city: 'Karachi', address: 'SITE Area, Block 7' },
  { name: 'Faisalabad Knitwear', contactPerson: 'Bilal Ahmed', phone: '+92 333 5566778', email: 'info@fsdknit.pk', city: 'Faisalabad', address: 'Sargodha Road' },
  { name: 'Sialkot Leather Works', contactPerson: 'Hassan Raza', phone: '+92 345 1122334', email: 'contact@sialkotleather.pk', city: 'Sialkot', address: 'Small Industrial Estate' },
  { name: 'Metro Accessories', contactPerson: 'Ayesha Khan', phone: '+92 302 9988776', email: 'hello@metroaccessories.pk', city: 'Lahore', address: 'Hall Road' },
];

const CUSTOMERS = [
  { name: 'Ali Hamza', phone: '+92 300 1234567', email: 'ali.hamza@example.com', city: 'Lahore' },
  { name: 'Fatima Noor', phone: '+92 321 2345678', email: 'fatima.noor@example.com', city: 'Lahore' },
  { name: 'Usman Tariq', phone: '+92 333 3456789', city: 'Karachi' },
  { name: 'Zainab Malik', phone: '+92 345 4567890', email: 'zainab.malik@example.com', city: 'Islamabad' },
  { name: 'Hamza Iqbal', phone: '+92 302 5678901', city: 'Lahore' },
  { name: 'Mehwish Anwar', phone: '+92 311 6789012', email: 'mehwish@example.com', city: 'Multan' },
  { name: 'Danish Raza', phone: '+92 322 7890123', city: 'Faisalabad' },
  { name: 'Sara Ahmed', phone: '+92 336 8901234', email: 'sara.ahmed@example.com', city: 'Lahore' },
];

const STAFF_USERS = [
  { email: 'manager@brandsloop.pk', name: 'Nida Aslam', role: 'MANAGER' as const },
  { email: 'staff@brandsloop.pk', name: 'Umar Farooq', role: 'STAFF' as const },
];

export async function seedDemoData(): Promise<void> {
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`• ${existing} product(s) already present — skipping demo catalogue.`);
    return;
  }

  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } });

  // Demo staff accounts share one obvious throwaway password; the seed prints
  // it so nobody has to go hunting, and it is only ever used in development.
  const demoPassword = 'Brandsloop@2026';
  for (const user of STAFF_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash: await hashPassword(demoPassword) },
      update: {},
    });
  }

  const suppliers = [] as { id: string; name: string }[];
  for (const supplier of SUPPLIERS) {
    const created = await prisma.supplier.create({ data: supplier });
    suppliers.push({ id: created.id, name: created.name });
  }

  for (const customer of CUSTOMERS) {
    await prisma.customer.create({ data: customer });
  }
  const customers = await prisma.customer.findMany({ select: { id: true } });

  const locations = await prisma.location.findMany({ orderBy: { isDefault: 'desc' } });
  const mainStore = locations.find((l) => l.code === 'MAIN')!;
  const warehouse = locations.find((l) => l.code === 'WH')!;

  // ── Catalogue ──────────────────────────────────────────────────────────────
  const createdVariants: { id: string; cost: number; price: number; sku: string }[] = [];

  for (const spec of CATALOGUE) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: spec.categorySlug } });
    const brand = await prisma.brand.findUniqueOrThrow({ where: { name: spec.brand } });
    const supplier = pick(suppliers);

    const productSku = await generateUniqueSku(prisma, SKU_FORMAT, {
      category: category.name,
      productName: spec.name,
    });

    const product = await prisma.product.create({
      data: {
        name: spec.name,
        sku: productSku,
        barcode: await generateUniqueBarcode(prisma),
        description: spec.description,
        categoryId: category.id,
        brandId: brand.id,
        supplierId: supplier.id,
        costPrice: toDecimal(spec.cost),
        sellingPrice: toDecimal(spec.price),
        wholesalePrice: toDecimal(spec.wholesale),
        taxRate: new Prisma.Decimal(0),
        minStock: spec.minStock,
        maxStock: spec.reorderLevel * 12,
        reorderLevel: spec.reorderLevel,
        status: 'ACTIVE',
      },
    });

    const sizes = spec.sizes.length > 0 ? spec.sizes : [null];
    for (const color of spec.colors) {
      for (const size of sizes) {
        const sku = await generateUniqueSku(prisma, SKU_FORMAT, {
          category: category.name,
          productName: spec.name,
          color,
          size: size ?? undefined,
        });
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku,
            barcode: await generateUniqueBarcode(prisma),
            size,
            color,
            style: spec.fit ?? null,
            material: spec.material ?? null,
            fit: spec.fit ?? null,
            costPrice: toDecimal(spec.cost),
            sellingPrice: toDecimal(spec.price),
            minStock: spec.minStock,
            reorderLevel: spec.reorderLevel,
          },
        });
        createdVariants.push({ id: variant.id, cost: spec.cost, price: spec.price, sku });
      }
    }
  }

  console.log(`• ${CATALOGUE.length} products / ${createdVariants.length} variants created.`);

  // ── Opening stock (90 days ago) ────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    for (const variant of createdVariants) {
      await applyStockChange(tx as unknown as PrismaClient, {
        variantId: variant.id,
        locationId: warehouse.id,
        delta: between(10, 40),
        type: 'OPENING_STOCK',
        userId: admin.id,
        referenceType: 'Seed',
        referenceNumber: 'OPENING',
        notes: 'Opening stock balance',
      });
    }
  });

  // Move part of the opening stock onto the shop floor. Quantities are capped
  // at what the warehouse actually holds — the stock engine rejects anything
  // that would drive a location negative.
  await prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx as unknown as PrismaClient, 'stockTransfer');
    const chosen = createdVariants.filter(() => random() > 0.15);
    const allocations: { variantId: string; quantity: number }[] = [];
    for (const variant of chosen) {
      const held = await tx.inventory.findUnique({
        where: { variantId_locationId: { variantId: variant.id, locationId: warehouse.id } },
        select: { quantity: true },
      });
      const quantity = Math.min(between(4, 12), Math.floor((held?.quantity ?? 0) / 2));
      if (quantity > 0) allocations.push({ variantId: variant.id, quantity });
    }
    const transfer = await tx.stockTransfer.create({
      data: {
        number,
        fromLocationId: warehouse.id,
        toLocationId: mainStore.id,
        status: 'COMPLETED',
        transferDate: daysAgo(85),
        completedAt: daysAgo(85),
        createdById: admin.id,
        notes: 'Initial shop-floor allocation',
        items: { create: allocations },
      },
      include: { items: true },
    });
    for (const item of transfer.items) {
      await applyStockChange(tx as unknown as PrismaClient, {
        variantId: item.variantId,
        locationId: warehouse.id,
        delta: -item.quantity,
        type: 'TRANSFER_OUT',
        userId: admin.id,
        referenceType: 'StockTransfer',
        referenceId: transfer.id,
        referenceNumber: number,
      });
      await applyStockChange(tx as unknown as PrismaClient, {
        variantId: item.variantId,
        locationId: mainStore.id,
        delta: item.quantity,
        type: 'TRANSFER_IN',
        userId: admin.id,
        referenceType: 'StockTransfer',
        referenceId: transfer.id,
        referenceNumber: number,
      });
    }
  });

  // ── Purchases ──────────────────────────────────────────────────────────────
  for (let index = 0; index < 12; index += 1) {
    const supplier = pick(suppliers);
    const orderDate = daysAgo(between(2, 75));
    const lines = Array.from({ length: between(2, 5) }, () => {
      const variant = pick(createdVariants);
      const quantity = between(6, 25);
      return {
        variantId: variant.id,
        quantity,
        unitCost: variant.cost,
        discount: 0,
        tax: 0,
        total: lineTotal({ unit: variant.cost, quantity }),
      };
    }).filter((line, i, all) => all.findIndex((l) => l.variantId === line.variantId) === i);

    const subtotal = sum(lines.map((line) => line.unitCost * line.quantity));
    // Most orders are received; a couple stay open so the dashboard shows
    // pending purchases and partial receipts.
    const outcome = index < 9 ? 'received' : index < 11 ? 'ordered' : 'partial';
    const paid = outcome === 'received' ? subtotal : outcome === 'partial' ? round2(subtotal / 2) : 0;

    await prisma.$transaction(async (tx) => {
      const client = tx as unknown as PrismaClient;
      const number = await nextNumber(client, 'purchase', orderDate);
      const purchase = await tx.purchase.create({
        data: {
          number,
          supplierId: supplier.id,
          locationId: warehouse.id,
          orderDate,
          expectedDate: daysAgo(between(0, 5)),
          status: 'ORDERED',
          subtotal: toDecimal(subtotal),
          discount: toDecimal(0),
          tax: toDecimal(0),
          total: toDecimal(subtotal),
          paidAmount: toDecimal(paid),
          paymentStatus: paid <= 0 ? 'UNPAID' : paid >= subtotal ? 'PAID' : 'PARTIAL',
          createdById: admin.id,
          items: {
            create: lines.map((line) => ({
              variantId: line.variantId,
              quantity: line.quantity,
              unitCost: toDecimal(line.unitCost),
              discount: toDecimal(0),
              tax: toDecimal(0),
              total: toDecimal(line.total),
            })),
          },
        },
        include: { items: true },
      });

      if (outcome === 'ordered') return;

      for (const item of purchase.items) {
        const receiving = outcome === 'received' ? item.quantity : Math.ceil(item.quantity / 2);
        await applyStockChange(client, {
          variantId: item.variantId,
          locationId: warehouse.id,
          delta: receiving,
          type: 'PURCHASE',
          userId: admin.id,
          referenceType: 'Purchase',
          referenceId: purchase.id,
          referenceNumber: number,
          notes: `Received against ${number}`,
        });
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: { receivedQty: receiving },
        });
      }
      await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: outcome === 'received' ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
          receivedDate: outcome === 'received' ? orderDate : null,
        },
      });
    });
  }

  // Spread some of the newly received stock to the shop floor so sales can
  // draw on it.
  await prisma.$transaction(async (tx) => {
    const client = tx as unknown as PrismaClient;
    for (const variant of createdVariants) {
      const warehouseStock = await tx.inventory.findUnique({
        where: { variantId_locationId: { variantId: variant.id, locationId: warehouse.id } },
        select: { quantity: true },
      });
      const movable = Math.floor((warehouseStock?.quantity ?? 0) / 2);
      if (movable < 2) continue;
      await applyStockChange(client, {
        variantId: variant.id,
        locationId: warehouse.id,
        delta: -movable,
        type: 'TRANSFER_OUT',
        userId: admin.id,
        referenceType: 'Seed',
        referenceNumber: 'RESTOCK',
        notes: 'Shop-floor replenishment',
      });
      await applyStockChange(client, {
        variantId: variant.id,
        locationId: mainStore.id,
        delta: movable,
        type: 'TRANSFER_IN',
        userId: admin.id,
        referenceType: 'Seed',
        referenceNumber: 'RESTOCK',
        notes: 'Shop-floor replenishment',
      });
    }
  });

  // ── Sales ──────────────────────────────────────────────────────────────────
  const staff = await prisma.user.findMany({ where: { role: { in: ['STAFF', 'MANAGER'] } } });
  const sellers = staff.length > 0 ? staff : [admin];
  const methods = ['CASH', 'CARD', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER'] as const;
  const soldVariants = new Set<string>();
  let salesCreated = 0;

  for (let index = 0; index < 90; index += 1) {
    const saleDate = daysAgo(between(0, 45));
    const seller = pick(sellers);
    const customer = random() > 0.35 ? pick(customers) : null;

    const candidates = Array.from({ length: between(1, 4) }, () => pick(createdVariants)).filter(
      (variant, i, all) => all.findIndex((v) => v.id === variant.id) === i,
    );

    const lines: {
      variantId: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      discount: number;
      total: number;
    }[] = [];

    for (const variant of candidates) {
      const stock = await prisma.inventory.findUnique({
        where: { variantId_locationId: { variantId: variant.id, locationId: mainStore.id } },
        select: { quantity: true },
      });
      const available = stock?.quantity ?? 0;
      if (available < 1) continue;
      const quantity = Math.min(available, between(1, 3));
      const discount = random() > 0.8 ? round2(variant.price * quantity * 0.1) : 0;
      lines.push({
        variantId: variant.id,
        quantity,
        unitPrice: variant.price,
        unitCost: variant.cost,
        discount,
        total: lineTotal({ unit: variant.price, quantity, discount }),
      });
    }
    if (lines.length === 0) continue;

    const subtotal = sum(lines.map((line) => line.unitPrice * line.quantity));
    const discount = sum(lines.map((line) => line.discount));
    const total = round2(subtotal - discount);

    await prisma.$transaction(async (tx) => {
      const client = tx as unknown as PrismaClient;
      const number = await nextNumber(client, 'sale', saleDate);
      const sale = await tx.sale.create({
        data: {
          number,
          customerId: customer?.id ?? null,
          locationId: mainStore.id,
          saleDate,
          status: 'COMPLETED',
          subtotal: toDecimal(subtotal),
          discount: toDecimal(discount),
          tax: toDecimal(0),
          total: toDecimal(total),
          paidAmount: toDecimal(total),
          paymentMethod: pick([...methods]),
          paymentStatus: 'PAID',
          createdById: seller.id,
          items: {
            create: lines.map((line) => ({
              variantId: line.variantId,
              quantity: line.quantity,
              unitPrice: toDecimal(line.unitPrice),
              unitCost: toDecimal(line.unitCost),
              discount: toDecimal(line.discount),
              tax: toDecimal(0),
              total: toDecimal(line.total),
            })),
          },
        },
      });

      for (const line of lines) {
        await applyStockChange(client, {
          variantId: line.variantId,
          locationId: mainStore.id,
          delta: -line.quantity,
          type: 'SALE',
          userId: seller.id,
          referenceType: 'Sale',
          referenceId: sale.id,
          referenceNumber: number,
          notes: `Sold on ${number}`,
        });
        soldVariants.add(line.variantId);
      }
    });
    salesCreated += 1;
  }

  // ── Returns ────────────────────────────────────────────────────────────────
  const recentSales = await prisma.sale.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { saleDate: 'desc' },
    take: 8,
    include: { items: true },
  });

  for (const [index, sale] of recentSales.slice(0, 5).entries()) {
    const item = sale.items[0];
    if (!item) continue;
    const damaged = index % 3 === 2;

    await prisma.$transaction(async (tx) => {
      const client = tx as unknown as PrismaClient;
      const number = await nextNumber(client, 'return', sale.saleDate);
      const record = await tx.return.create({
        data: {
          number,
          type: 'CUSTOMER',
          saleId: sale.id,
          customerId: sale.customerId,
          locationId: sale.locationId,
          returnDate: sale.saleDate,
          reason: damaged ? 'Stitching defect' : 'Size did not fit',
          refundAmount: damaged ? toDecimal(0) : toDecimal(Number(item.unitPrice)),
          createdById: admin.id,
          items: {
            create: [
              {
                variantId: item.variantId,
                quantity: 1,
                condition: damaged ? 'DAMAGED' : 'RESELLABLE',
                unitPrice: item.unitPrice,
                reason: damaged ? 'Stitching defect' : 'Size did not fit',
              },
            ],
          },
        },
      });

      await applyStockChange(client, {
        variantId: item.variantId,
        locationId: sale.locationId,
        delta: 1,
        type: damaged ? 'DAMAGED' : 'CUSTOMER_RETURN',
        userId: admin.id,
        referenceType: 'Return',
        referenceId: record.id,
        referenceNumber: number,
        notes: damaged ? 'Damaged return — held out of sellable stock' : 'Customer return',
        toDamaged: damaged,
      });
    });
  }

  // ── A stock adjustment, so the audit trail has one on record ───────────────
  const adjustVariant = pick(createdVariants);
  await prisma.$transaction(async (tx) => {
    const client = tx as unknown as PrismaClient;
    const number = await nextNumber(client, 'stockAdjustment');
    const current = await tx.inventory.findUnique({
      where: { variantId_locationId: { variantId: adjustVariant.id, locationId: mainStore.id } },
      select: { quantity: true },
    });
    const previousQty = current?.quantity ?? 0;
    if (previousQty < 1) return;
    const newQty = previousQty - 1;

    const adjustment = await tx.stockAdjustment.create({
      data: {
        number,
        locationId: mainStore.id,
        reason: 'COUNTING_ERROR',
        notes: 'Shelf count did not match the system.',
        createdById: admin.id,
        adjustedAt: daysAgo(3),
      },
    });
    await applyStockChange(client, {
      variantId: adjustVariant.id,
      locationId: mainStore.id,
      delta: newQty - previousQty,
      type: 'ADJUSTMENT',
      userId: admin.id,
      referenceType: 'StockAdjustment',
      referenceId: adjustment.id,
      referenceNumber: number,
      notes: 'Counting error correction',
    });
    await tx.stockAdjustmentItem.create({
      data: {
        adjustmentId: adjustment.id,
        variantId: adjustVariant.id,
        previousQty,
        newQty,
        difference: newQty - previousQty,
      },
    });
  });

  await refreshStockAlerts(createdVariants.map((variant) => variant.id));

  const [purchaseCount, movementCount, notificationCount] = await Promise.all([
    prisma.purchase.count(),
    prisma.stockMovement.count(),
    prisma.notification.count(),
  ]);

  console.log(
    `• Demo data: ${suppliers.length} suppliers, ${CUSTOMERS.length} customers, ` +
      `${purchaseCount} purchases, ${salesCreated} sales, ${movementCount} stock movements, ` +
      `${notificationCount} alerts.`,
  );
  console.log(`• Demo staff logins: manager@brandsloop.pk / staff@brandsloop.pk — password ${demoPassword}`);
}
