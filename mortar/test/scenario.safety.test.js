import test from "node:test";
import assert from "node:assert/strict";
import { testApp, messagesTo, callsTo, onlyCase } from "./helpers.js";
import * as sim from "../src/demo/simulate.js";
import { simulatedProvider } from "../src/models/providers/simulated.js";
import { ConnectorError } from "../src/core/outbox.js";

// Safety steps are vetted templates chosen by the emergency's category — never generated,
// and never the wrong template. (Regression: every P1 without a rule-set safety type used to
// get the WATER steps, so a model-triaged gas smell was told to close the water valve.)

const MAYA = { phone: "+15125550142", email: "maya.t@example.com" };

/** A local model that answers triage the way a real one would for this message. */
const triageSays = (output) => ({
  name: "scripted",
  tier: "local",
  model: "scripted",
  simulated: true,
  async complete({ task }) {
    if (task.name !== "maintenance.triage") throw new Error(`unexpected task ${task.name}`);
    return { output, text: JSON.stringify(output), model: "scripted", inputTokens: 120, outputTokens: 40, cachedTokens: 0, costUsd: 0, latencyMs: 0, estimated: true };
  },
  async health() {
    return { ok: true, detail: "scripted" };
  },
});
const gasTriage = { is_maintenance: true, category: "gas", urgency: "P1", summary: "Strong natural gas smell near water heater", room: null, hazards: ["gas"], confidence: 0.92 };

test("a model-triaged gas emergency gets the GAS steps — not the water valve", async () => {
  const app = testApp({ providers: { local: triageSays(gasTriage), frontier: simulatedProvider({ tier: "frontier" }) } });
  await sim.sms(app, { from: MAYA.phone, body: "There's a strong smell of natural gas near the water heater closet" });
  await app.settle();
  const c = onlyCase(app, "maintenance");
  assert.equal(c.priority, "P1");
  const [reply] = messagesTo(app, MAYA.phone);
  assert.match(reply.body, /leave your home now/i);
  assert.doesNotMatch(reply.body, /water valve|towels/i);
});

test("no heat at 34°F gets cold-weather steps, not water steps", async () => {
  const app = testApp();
  app.store.setKV("weather", { tempF: 34, observedAt: app.clock.now().toISOString(), source: "test" });
  await sim.sms(app, { from: MAYA.phone, body: "The heater stopped working" });
  await app.settle();
  const [reply] = messagesTo(app, MAYA.phone);
  assert.match(reply.body, /safe heat sources/);
  assert.doesNotMatch(reply.body, /water valve/i);
});

test("emergency SMS undeliverable → a voice call with the same vetted steps", async () => {
  const app = testApp({ providers: { local: triageSays(gasTriage), frontier: simulatedProvider({ tier: "frontier" }) } });
  const send = app.connectors.twilio.sendSms;
  app.connectors.twilio.sendSms = async (payload, opts) => {
    if (payload.to === MAYA.phone) throw new ConnectorError("Twilio 21610: unsubscribed recipient", { retryable: false, status: 400 });
    return send(payload, opts);
  };
  await sim.email(app, { from: MAYA.email, subject: "gas", body: "There's a strong smell of natural gas near the water heater closet" });
  await app.settle();
  const [voice] = callsTo(app, MAYA.phone);
  assert.ok(voice, "the resident is called instead");
  assert.match(voice.say, /leave your home now/i);
  assert.doesNotMatch(voice.say, /water valve/i);
});
