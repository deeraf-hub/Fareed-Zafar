import { makeEvent } from "./events.js";

/**
 * Event intake and dispatch.
 *
 * ingest():   validate → persist (deduplicated by idempotency key) → enqueue.
 *             Webhook handlers call this and return 200 immediately; processing is
 *             asynchronous, so a slow model call never times out a webhook.
 *
 * Ordering:   events are processed in arrival order *per subject* (a phone number,
 *             mailbox, or case), concurrently across subjects. Two events that race
 *             on the same case are caught by optimistic concurrency in the store and
 *             the loser is re-run against fresh state.
 *
 * Recovery:   on start, anything persisted but not yet processed is re-queued.
 */
export function createProcessor({ store, clock, pipeline, log, emit = () => {}, concurrency = 4 }) {
  const queues = new Map(); // subject key → Promise chain
  let active = 0;
  const waiting = [];
  const idleWaiters = new Set();

  async function ingest(raw) {
    const event = makeEvent(raw);
    const { inserted, id } = store.insertEvent({ ...event, receivedAt: clock.now().toISOString() });
    if (!inserted) {
      log.info("duplicate event ignored", { idempotencyKey: event.idempotencyKey, eventId: id });
      emit("duplicate", { idempotencyKey: event.idempotencyKey, eventId: id });
      return { id, duplicate: true };
    }
    enqueue(id, subjectKey(event));
    return { id, duplicate: false };
  }

  function enqueue(eventId, key) {
    const previous = queues.get(key) ?? Promise.resolve();
    const run = previous.then(() => withSlot(() => pipeline.processEvent(eventId))).catch((err) => log.error("processor error", { eventId, error: err.message }));
    queues.set(key, run);
    run.finally(() => {
      if (queues.get(key) === run) queues.delete(key);
      if (!queues.size) for (const resolve of idleWaiters) resolve();
    });
  }

  async function withSlot(fn) {
    if (active >= concurrency) await new Promise((resolve) => waiting.push(resolve));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      waiting.shift()?.();
    }
  }

  return {
    ingest,
    /** Resolves when every queued event has been processed (tests, fast-forward). */
    idle() {
      if (!queues.size) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => {
          idleWaiters.delete(done);
          resolve();
        };
        idleWaiters.add(done);
      });
    },
    recover() {
      const pending = store.unprocessedEvents();
      for (const e of pending) enqueue(e.id, subjectKey(e));
      if (pending.length) log.warn("recovered unprocessed events", { count: pending.length });
      return pending.length;
    },
  };
}

function subjectKey(event) {
  const s = event.subject ?? {};
  return s.caseId ?? s.phone ?? s.email ?? s.partyId ?? `type:${event.type}`;
}
