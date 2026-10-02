/**
 * Durable timers → `timer.fired` events.
 *
 * Playbooks never sleep. "Call the next vendor if nobody accepts in 10 minutes" is a
 * row in the timers table; when it comes due the scheduler emits an event and the
 * pipeline decides — with fresh state — whether it still matters (a vendor who already
 * accepted makes the timer a no-op). Timers survive restarts and are claimed
 * atomically, so each fires exactly once.
 */
export function createScheduler({ store, clock, ingest, log, pollMs = 1000 }) {
  let interval = null;
  let ticking = null;

  async function fireDue() {
    const due = store.dueTimers(clock.now().toISOString());
    for (const timer of due) {
      if (!store.claimTimer(timer.id)) continue;
      log.info("timer fired", { kind: timer.kind, caseId: timer.caseId });
      await ingest({
        type: "timer.fired",
        source: "scheduler",
        idempotencyKey: `timer:${timer.id}`,
        occurredAt: timer.dueAt,
        subject: { caseId: timer.caseId },
        payload: { timerId: timer.id, kind: timer.kind, ...timer.payload },
      });
    }
    return due.length;
  }

  /** Fire every due timer. Coalesced like outbox.drain() — see the note there. */
  function tick() {
    if (ticking) return ticking;
    ticking = fireDue().finally(() => {
      ticking = null;
    });
    return ticking;
  }

  return {
    tick,
    start() {
      interval = setInterval(() => tick().catch((err) => log.error("scheduler tick failed", { error: err.message })), pollMs);
      interval.unref?.();
    },
    stop() {
      clearInterval(interval);
    },
  };
}
