/**
 * Outbox worker: executes committed actions against external systems.
 *
 * Why an outbox: the pipeline writes "send this SMS" in the same transaction as the
 * state change that caused it. If the process dies right after, the action is still
 * there on restart; if the webhook that caused it is redelivered, the idempotency key
 * stops a second send. Nothing is lost, nothing is doubled.
 *
 *   pending → in_flight → done
 *                      ↘ retry with backoff (2s, 10s, 30s, 2m, 10m + jitter)
 *                      ↘ dead → action.failed event → playbook fallback / human exception
 *
 * Connectors raise errors with `retryable: false` for permanent failures (bad number,
 * 4xx) so the worker dead-letters immediately instead of retrying a lost cause.
 */

const BACKOFF_MS = [2_000, 10_000, 30_000, 120_000, 600_000];

export function backoffDelay(attempt, random = Math.random) {
  const base = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
  return Math.round(base * (0.8 + random() * 0.4));
}

export class ConnectorError extends Error {
  constructor(message, { retryable = true, status = null } = {}) {
    super(message);
    this.name = "ConnectorError";
    this.retryable = retryable;
    this.status = status;
  }
}

export function createOutbox({ store, clock, connectors, ingest, log, maxAttempts = 6, pollMs = 500, onChange = () => {} }) {
  let interval = null;
  let draining = null;

  async function execute(action) {
    const nowIso = clock.now().toISOString();
    if (!store.claimAction(action.id, nowIso)) return; // another worker has it
    const attempt = action.attempts + 1;
    const connector = connectors[action.connector];

    try {
      if (!connector || typeof connector[action.operation] !== "function") {
        throw new ConnectorError(`No connector operation ${action.connector}.${action.operation}`, { retryable: false });
      }
      const result = (await connector[action.operation](action.payload, { idempotencyKey: action.idempotencyKey, action })) ?? {};
      store.completeAction(action.id, result, clock.now().toISOString());
      log.info("action done", { action: action.label, caseId: action.caseId, attempt });
      if (action.meta?.notify) {
        await ingest({
          type: "action.completed",
          source: "outbox",
          idempotencyKey: `outbox:${action.id}:done`,
          occurredAt: clock.now().toISOString(),
          subject: action.caseId ? { caseId: action.caseId } : {},
          payload: { actionId: action.id, key: action.meta.key, connector: action.connector, operation: action.operation, result },
        });
      }
    } catch (err) {
      const retryable = err.retryable !== false;
      if (retryable && attempt < maxAttempts) {
        const next = new Date(clock.now().getTime() + backoffDelay(attempt)).toISOString();
        store.retryAction(action.id, err.message, next, clock.now().toISOString());
        log.warn("action failed — will retry", { action: action.label, attempt, next, error: err.message });
      } else {
        store.deadLetterAction(action.id, err.message, clock.now().toISOString());
        log.error("action dead-lettered", { action: action.label, attempt, error: err.message });
        await ingest({
          type: "action.failed",
          source: "outbox",
          idempotencyKey: `outbox:${action.id}:dead`,
          occurredAt: clock.now().toISOString(),
          subject: action.caseId ? { caseId: action.caseId } : {},
          payload: { actionId: action.id, key: action.meta?.key, connector: action.connector, operation: action.operation, error: err.message, label: action.label },
        });
      }
    }
    onChange(action.caseId);
  }

  async function drainOnce() {
    for (let round = 0; round < 20; round++) {
      const due = store.dueActions(clock.now().toISOString(), 25);
      if (!due.length) break;
      for (const action of due) await execute(action);
    }
  }

  /**
   * Execute everything due now. Safe to call concurrently (calls are coalesced).
   * The guard is cleared in a .finally() on the stored promise, never inside the async
   * body: with nothing due the body finishes synchronously, and a `finally` in there
   * would run before the assignment and leave a settled promise in the guard forever.
   */
  function drain() {
    if (draining) return draining;
    draining = drainOnce().finally(() => {
      draining = null;
    });
    return draining;
  }

  return {
    drain,
    execute,
    start() {
      const requeued = store.requeueInFlight(clock.now().toISOString());
      if (requeued) log.warn("requeued in-flight actions after restart", { count: requeued });
      interval = setInterval(() => drain().catch((err) => log.error("outbox drain failed", { error: err.message })), pollMs);
      interval.unref?.();
    },
    stop() {
      clearInterval(interval);
    },
  };
}
