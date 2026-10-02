import test from "node:test";
import assert from "node:assert/strict";
import { openStore } from "../src/core/store.js";
import { simulatedClock } from "../src/core/clock.js";
import { silentLogger } from "../src/core/logger.js";
import { createOutbox } from "../src/core/outbox.js";
import { createScheduler } from "../src/core/scheduler.js";
import { testApp, WED_2330, messagesTo } from "./helpers.js";
import * as sim from "../src/demo/simulate.js";

// Regression: the coalescing guards in drain()/tick() used to be cleared inside the async
// body. With nothing due the body finished synchronously, the `finally` ran before the
// assignment, and the guard kept a settled promise forever — after one idle poll the
// outbox never sent again and timers never fired. Scenario tests didn't catch it because
// they drive the workers through settle(), which only drains when something is due.

const at = (clock) => clock.now().toISOString();

test("outbox: work enqueued after an idle drain still executes", async () => {
  const store = openStore(":memory:");
  const clock = simulatedClock(WED_2330);
  const sent = [];
  const connectors = { twilio: { sendSms: async (payload) => (sent.push(payload), { sid: "SM1" }) } };
  const outbox = createOutbox({ store, clock, connectors, ingest: async () => {}, log: silentLogger });

  await outbox.drain(); // nothing due: completes synchronously
  store.enqueueAction({ idempotencyKey: "k1", connector: "twilio", operation: "sendSms", label: "SMS", payload: { to: "+1", body: "hi" }, meta: {}, createdAt: at(clock) });
  await outbox.drain();

  assert.equal(sent.length, 1);
  assert.equal(store.listActions({})[0].status, "done");
});

test("scheduler: timers that come due after an idle tick still fire", async () => {
  const store = openStore(":memory:");
  const clock = simulatedClock(WED_2330);
  const fired = [];
  const scheduler = createScheduler({ store, clock, ingest: async (e) => fired.push(e), log: silentLogger });

  assert.equal(await scheduler.tick(), 0);
  store.scheduleTimer({ caseId: "MC-0001", kind: "vendor_timeout", dueAt: at(clock), createdAt: at(clock) });
  assert.equal(await scheduler.tick(), 1);
  assert.equal(fired[0].payload.kind, "vendor_timeout");
});

test("background workers alone (no settle) deliver an emergency's first response", async () => {
  const app = testApp();
  app.start(); // pollers run on their own, as in production
  try {
    await new Promise((resolve) => setTimeout(resolve, 700)); // at least one idle poll first
    await sim.email(app, { from: "maya.t@example.com", subject: "Leak!!", body: "There is water coming through the ceiling." });
    const deadline = Date.now() + 5000;
    while (!messagesTo(app, "+15125550142").length && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(messagesTo(app, "+15125550142").length >= 1, "the pollers sent the resident's emergency SMS");
  } finally {
    app.stop();
  }
});
