import type { Tx } from '../db.js';

type Numbered = 'purchase' | 'sale' | 'return' | 'stockAdjustment' | 'stockCount' | 'stockTransfer';

const PREFIX: Record<Numbered, string> = {
  purchase: 'PO',
  sale: 'SL',
  return: 'RT',
  stockAdjustment: 'ADJ',
  stockCount: 'SC',
  stockTransfer: 'TR',
};

/**
 * Produces the next human-readable document number, e.g. `PO-2026-0007`.
 * Numbers restart each calendar year. Two concurrent writers can briefly agree
 * on the same value; the unique index rejects the loser and `withRetry` below
 * simply tries again.
 */
export async function nextNumber(tx: Tx, entity: Numbered, now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `${PREFIX[entity]}-${year}-`;
  const delegate = tx[entity] as unknown as {
    findFirst(args: unknown): Promise<{ number: string } | null>;
  };
  const latest = await delegate.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const lastSeq = latest ? Number(latest.number.slice(prefix.length)) : 0;
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/** Retries an operation that can lose a document-number race. */
export async function withNumberRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const code = (error as { code?: string }).code;
      const target = String((error as { meta?: { target?: unknown } }).meta?.target ?? '');
      if (code === 'P2002' && target.includes('number')) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
