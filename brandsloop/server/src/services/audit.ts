import type { Request } from 'express';
import { prisma } from '../db.js';
import type { Tx } from '../db.js';

export interface AuditInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

function clean(value: unknown): any {
  if (value === undefined || value === null) return undefined;
  // Decimal/Date instances are not JSON-serialisable by Prisma's Json column.
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === 'bigint' ? val.toString() : val,
    ),
  );
}

/**
 * Records an auditable action. Audit writes never fail the user's request —
 * a logging problem must not roll back a completed sale.
 */
export async function recordAudit(input: AuditInput, tx?: Tx): Promise<void> {
  const client = tx ?? prisma;
  try {
    await client.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: clean(input.before),
        after: clean(input.after),
        ip: input.ip ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] failed to write audit log', error);
  }
}

/** Convenience wrapper that pulls user and IP straight off the request. */
export async function auditFromRequest(
  req: Request,
  input: Omit<AuditInput, 'userId' | 'ip'>,
): Promise<void> {
  await recordAudit({
    ...input,
    userId: req.user?.id ?? null,
    ip: req.ip ?? null,
  });
}
