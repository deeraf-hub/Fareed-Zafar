import type { MovementType } from '@prisma/client';
import type { Tx } from '../db.js';
import { insufficientStock, notFound } from '../lib/errors.js';

export interface StockChange {
  variantId: string;
  locationId: string;
  /** Signed change: positive receives stock, negative issues it. */
  delta: number;
  type: MovementType;
  userId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  /** Routes damaged units to the damaged bucket instead of sellable stock. */
  toDamaged?: boolean;
  /** Only stock counts and corrective adjustments may drive stock negative. */
  allowNegative?: boolean;
}

interface InventoryRow {
  id: string;
  quantity: number;
  reserved: number;
  damaged: number;
}

/**
 * Locks (or creates) the inventory row for a variant at a location.
 * `FOR UPDATE` serialises concurrent sales of the same variant so two
 * simultaneous checkouts cannot both pass the stock check.
 */
async function lockInventory(
  tx: Tx,
  variantId: string,
  locationId: string,
): Promise<InventoryRow> {
  const rows = await tx.$queryRaw<InventoryRow[]>`
    SELECT id, quantity, reserved, damaged
    FROM "Inventory"
    WHERE "variantId" = ${variantId} AND "locationId" = ${locationId}
    FOR UPDATE
  `;
  if (rows.length > 0) return rows[0]!;

  const variant = await tx.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true },
  });
  if (!variant) throw notFound('Product variant');
  const location = await tx.location.findUnique({
    where: { id: locationId },
    select: { id: true },
  });
  if (!location) throw notFound('Location');

  const created = await tx.inventory.create({
    data: { variantId, locationId, quantity: 0, reserved: 0, damaged: 0 },
    select: { id: true, quantity: true, reserved: true, damaged: true },
  });
  return created;
}

export interface StockChangeResult {
  previousQty: number;
  newQty: number;
  movementId: string;
}

/**
 * The single entry point for changing stock. Every caller goes through here,
 * which guarantees business rule #2: no stock quantity ever changes without a
 * matching, traceable StockMovement row.
 */
export async function applyStockChange(tx: Tx, change: StockChange): Promise<StockChangeResult> {
  const {
    variantId,
    locationId,
    delta,
    type,
    userId = null,
    referenceType = null,
    referenceId = null,
    referenceNumber = null,
    notes = null,
    toDamaged = false,
    allowNegative = false,
  } = change;

  if (!Number.isInteger(delta)) {
    throw insufficientStock('Stock quantities must be whole numbers.');
  }
  if (delta === 0) {
    throw insufficientStock('Stock movement quantity cannot be zero.');
  }

  const row = await lockInventory(tx, variantId, locationId);

  // Damaged units are recorded but never join sellable stock.
  if (toDamaged) {
    await tx.inventory.update({
      where: { id: row.id },
      data: { damaged: { increment: Math.abs(delta) } },
    });
    const movement = await tx.stockMovement.create({
      data: {
        variantId,
        locationId,
        type,
        quantity: delta,
        previousQty: row.quantity,
        newQty: row.quantity,
        referenceType,
        referenceId,
        referenceNumber,
        userId,
        notes,
      },
      select: { id: true },
    });
    return { previousQty: row.quantity, newQty: row.quantity, movementId: movement.id };
  }

  const newQty = row.quantity + delta;
  if (newQty < 0 && !allowNegative) {
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: { sku: true, product: { select: { name: true } } },
    });
    const label = variant ? `${variant.product.name} (${variant.sku})` : 'this item';
    throw insufficientStock(
      `Not enough stock for ${label}. Available: ${row.quantity}, required: ${Math.abs(delta)}.`,
    );
  }

  await tx.inventory.update({ where: { id: row.id }, data: { quantity: newQty } });

  const movement = await tx.stockMovement.create({
    data: {
      variantId,
      locationId,
      type,
      quantity: delta,
      previousQty: row.quantity,
      newQty,
      referenceType,
      referenceId,
      referenceNumber,
      userId,
      notes,
    },
    select: { id: true },
  });

  return { previousQty: row.quantity, newQty, movementId: movement.id };
}

/** Current sellable quantity for a variant at one location (0 if untracked). */
export async function availableStock(
  tx: Tx,
  variantId: string,
  locationId: string,
): Promise<number> {
  const record = await tx.inventory.findUnique({
    where: { variantId_locationId: { variantId, locationId } },
    select: { quantity: true, reserved: true },
  });
  if (!record) return 0;
  return record.quantity - record.reserved;
}

export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVERSTOCK' | 'IN_STOCK';

/**
 * Stock status shown throughout the app. Reorder level takes priority over the
 * hard minimum so buyers are warned before they actually run short.
 */
export function stockStatus(input: {
  quantity: number;
  minStock: number;
  reorderLevel?: number | null;
  maxStock?: number | null;
}): StockStatus {
  const { quantity, minStock } = input;
  const reorder = input.reorderLevel ?? 0;
  const threshold = Math.max(minStock, reorder);
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (threshold > 0 && quantity <= threshold) return 'LOW_STOCK';
  if (input.maxStock && input.maxStock > 0 && quantity > input.maxStock) return 'OVERSTOCK';
  return 'IN_STOCK';
}
