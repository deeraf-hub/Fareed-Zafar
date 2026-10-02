import test from "node:test";
import assert from "node:assert/strict";
import { testApp, stage, messagesTo, callsTo, onlyCase } from "./helpers.js";
import * as sim from "../src/demo/simulate.js";
import { HOUR } from "../src/core/clock.js";

const MAYA = "+15125550142";
const BRIGHTLINE_HVAC = "+15125550115";

// Emergency SOP: no heat is P1 at or below 40°F. The temperature comes from the weather
// feed (n8n refreshes it hourly) — structured data and a rule, not a model.
test("weather feed: 'the heater stopped working' at 34°F outside is a P1 — no model involved", async () => {
  const app = testApp();
  app.store.setKV("weather", { tempF: 34, observedAt: app.clock.now().toISOString(), source: "test" });
  await sim.sms(app, { from: MAYA, body: "The heater stopped working" });
  await app.settle();

  const c = onlyCase(app, "maintenance");
  assert.equal(c.priority, "P1");
  assert.ok(c.facts.rulesFired.includes("no_heat_at_or_below_40F"));
  const trace = app.store.listEvents({ caseId: c.id }).at(-1).trace;
  assert.equal(stage(trace, "model").status, "skip", "rules decided it");
  assert.equal(callsTo(app, BRIGHTLINE_HVAC).length, 1, "the after-hours HVAC vendor is called");
  assert.match(messagesTo(app, MAYA)[0].body, /treating it as an emergency/);
});

test("weather feed: a stale reading (older than 3 h) never sets severity", async () => {
  const app = testApp();
  const fourHoursAgo = new Date(app.clock.now().getTime() - 4 * HOUR).toISOString();
  app.store.setKV("weather", { tempF: 30, observedAt: fourHoursAgo, source: "test" });
  await sim.sms(app, { from: MAYA, body: "The heater stopped working" });
  await app.settle();
  assert.equal(onlyCase(app, "maintenance").priority, "P2");
});
