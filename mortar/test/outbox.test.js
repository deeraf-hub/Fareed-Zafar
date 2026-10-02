import test from "node:test";
import assert from "node:assert/strict";
import { openStore } from "../src/core/store.js";
import { simulatedClock } from "../src/core/clock.js";
import { silentLogger } from "../src/core/logger.js";
import { createOutbox, ConnectorError, backoffDelay } from "../src/core/outbox.js";

function setup(sendSms, { maxAttempts = 6 } = {}) {
  const store = openStore(":memory:");
  const clock = simulatedClock("2026-10-08T04:30:00Z");
  const events = [];
  const outbox = createOutbox({ store, clock, connectors: { twilio: { sendSms } }, ingest: async (e) => events.push(e), log: silentLogger, maxAttempts });
  store.enqueueAction({ caseId: "MC-1", idempotencyKey: "MC-1:e1:reply-sms", connector: "twilio", operation: "sendSms", label: "SMS", payload: { to: "+1", body: "hi" }, meta: { key: "reply-sms" }, createdAt: clock.now().toISOString() });
  const action = () => store.listActions({})[0];
  return { store, clock, outbox, events, action };
}

test("backoff grows 2 s → 10 s → 30 s → 2 min → 10 min, with ±20% jitter", () => {
  const mid = () => 0.5;
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((n) => backoffDelay(n, mid)), [2000, 10000, 30000, 120000, 600000, 600000]);
  assert.equal(backoffDelay(1, () => 0), 1600);
  assert.equal(backoffDelay(1, () => 1), 2400);
});

test("a transient failure is retried later, then succeeds; the idempotency key goes to the connector", async () => {
  let calls = 0;
  const keys = [];
  const { clock, outbox, action } = setup(async (_payload, { idempotencyKey }) => {
    keys.push(idempotencyKey);
    if (++calls === 1) throw new ConnectorError("503", { retryable: true });
    return { sid: "SM1" };
  });
  await outbox.drain();
  assert.equal(action().status, "pending");
  assert.ok(Date.parse(action().nextAttemptAt) > clock.now().getTime(), "not retried immediately");
  await outbox.drain();
  assert.equal(calls, 1, "nothing happens before the backoff elapses");
  clock.advance(3000);
  await outbox.drain();
  assert.equal(action().status, "done");
  assert.deepEqual(keys, ["MC-1:e1:reply-sms", "MC-1:e1:reply-sms"]);
});

test("a permanent failure dead-letters at once and tells the playbook", async () => {
  const { outbox, events, action } = setup(async () => {
    throw new ConnectorError("Invalid 'To' number", { retryable: false, status: 400 });
  });
  await outbox.drain();
  assert.equal(action().status, "dead");
  assert.equal(events[0].type, "action.failed");
  assert.equal(events[0].payload.key, "reply-sms");
});

test("retries stop at maxAttempts", async () => {
  const { clock, outbox, events, action } = setup(async () => {
    throw new ConnectorError("503", { retryable: true });
  }, { maxAttempts: 3 });
  for (let i = 0; i < 3; i++) {
    await outbox.drain();
    clock.advance(15 * 60_000);
  }
  assert.equal(action().status, "dead");
  assert.equal(action().attempts, 3);
  assert.equal(events.length, 1);
});
