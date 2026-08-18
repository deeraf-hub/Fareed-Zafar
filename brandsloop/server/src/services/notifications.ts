import { NotificationLevel, NotificationType } from '@prisma/client';
import { prisma } from '../db.js';

interface NotifyInput {
  type: NotificationType;
  level?: NotificationLevel;
  title: string;
  message: string;
  entity?: string | null;
  entityId?: string | null;
}

/**
 * Creates (or refreshes) a notification. The unique key on
 * (type, entity, entityId) keeps repeated low-stock checks from flooding the
 * bell with duplicates — the existing row is updated instead.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const entity = input.entity ?? null;
  const entityId = input.entityId ?? null;
  try {
    await prisma.notification.upsert({
      where: {
        type_entity_entityId: { type: input.type, entity: entity ?? '', entityId: entityId ?? '' },
      },
      create: {
        type: input.type,
        level: input.level ?? NotificationLevel.INFO,
        title: input.title,
        message: input.message,
        entity: entity ?? '',
        entityId: entityId ?? '',
      },
      update: {
        level: input.level ?? NotificationLevel.INFO,
        title: input.title,
        message: input.message,
        isRead: false,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[notifications] failed to create notification', error);
  }
}

/**
 * Re-evaluates stock levels for the given variants and raises or clears
 * low-stock / out-of-stock notifications. Called after any transaction that
 * moved stock, outside that transaction so it can never block a sale.
 */
export async function refreshStockAlerts(variantIds: string[]): Promise<void> {
  const unique = [...new Set(variantIds)].filter(Boolean);
  if (unique.length === 0) return;

  try {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: unique } },
      select: {
        id: true,
        sku: true,
        size: true,
        color: true,
        minStock: true,
        reorderLevel: true,
        product: { select: { name: true, minStock: true, reorderLevel: true } },
        inventory: { select: { quantity: true } },
      },
    });

    for (const variant of variants) {
      const quantity = variant.inventory.reduce((total, row) => total + row.quantity, 0);
      const threshold = Math.max(
        variant.minStock || variant.product.minStock,
        variant.reorderLevel || variant.product.reorderLevel,
      );
      const label = [variant.product.name, [variant.color, variant.size].filter(Boolean).join(' / ')]
        .filter(Boolean)
        .join(' — ');

      if (quantity <= 0) {
        await prisma.notification.deleteMany({
          where: { type: NotificationType.LOW_STOCK, entityId: variant.id },
        });
        await notify({
          type: NotificationType.OUT_OF_STOCK,
          level: NotificationLevel.CRITICAL,
          title: 'Out of stock',
          message: `${label} (${variant.sku}) is out of stock.`,
          entity: 'ProductVariant',
          entityId: variant.id,
        });
        continue;
      }

      await prisma.notification.deleteMany({
        where: { type: NotificationType.OUT_OF_STOCK, entityId: variant.id },
      });

      if (threshold > 0 && quantity <= threshold) {
        await notify({
          type: NotificationType.LOW_STOCK,
          level: NotificationLevel.WARNING,
          title: 'Low stock',
          message: `${label} (${variant.sku}) is down to ${quantity} — reorder level is ${threshold}.`,
          entity: 'ProductVariant',
          entityId: variant.id,
        });
      } else {
        await prisma.notification.deleteMany({
          where: { type: NotificationType.LOW_STOCK, entityId: variant.id },
        });
      }
    }
  } catch (error) {
    console.error('[notifications] failed to refresh stock alerts', error);
  }
}
