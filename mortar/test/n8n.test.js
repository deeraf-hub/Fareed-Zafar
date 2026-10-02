import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import express from "express";
import { testApp, onlyCase } from "./helpers.js";
import { createWebhooks } from "../src/http/webhooks.js";
import * as sim from "../src/demo/simulate.js";

// The n8n workflows are tested the way they run: each Code node's JavaScript is executed
// with sample inputs, its output is signed exactly as the Crypto node signs it, and the
// request the HTTP node would send goes to a real Mortar webhook server.

const DIR = new URL("../n8n/", import.meta.url);
const workflows = Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => [f, JSON.parse(readFileSync(new URL(f, DIR), "utf8"))]));
const node = (file, name) => workflows[file].nodes.find((n) => n.name === name);

async function runCode(file, name, items, { env = {}, staticData = {} } = {}) {
  const $input = { all: () => items.map((json) => ({ json })), first: () => ({ json: items[0] }) };
  const fn = new Function("$input", "$env", "$getWorkflowStaticData", `return (async () => {\n${node(file, name).parameters.jsCode}\n})();`);
  return fn($input, env, () => staticData);
}

async function mortar(t) {
  const app = testApp();
  const http = express().use(createWebhooks({ getApp: () => app, config: app.config }));
  const server = http.listen(0);
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const secret = app.config.security.webhookSecret;
  /** What "Sign (HMAC-SHA256)" + "POST …" do with one Code-node output item. */
  const send = (path, item, signWith = secret) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-mortar-signature": `sha256=${createHmac("sha256", signWith).update(item.json.payload).digest("hex")}` },
      body: item.json.payload,
    });
  return { app, send };
}

test("every workflow is well-formed: one trigger, connections point at real nodes", () => {
  assert.equal(Object.keys(workflows).length, 6);
  for (const [file, wf] of Object.entries(workflows)) {
    const names = new Set(wf.nodes.map((n) => n.name));
    assert.equal(names.size, wf.nodes.length, `${file}: node names are unique`);
    const triggers = wf.nodes.filter((n) => /Trigger$|webhook$|emailReadImap$/i.test(n.type));
    assert.equal(triggers.length, 1, `${file}: exactly one trigger`);
    for (const [from, { main }] of Object.entries(wf.connections)) {
      assert.ok(names.has(from), `${file}: ${from} exists`);
      for (const link of main.flat()) assert.ok(names.has(link.node), `${file}: ${link.node} exists`);
    }
  }
});

test("every request to Mortar sends exactly the string that was signed", () => {
  for (const [file, wf] of Object.entries(workflows)) {
    for (const http of wf.nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest" && /\/(events|directory\/sync)$/.test(n.parameters.url))) {
      const upstream = Object.entries(wf.connections).find(([, { main }]) => main.flat().some((l) => l.node === http.name))?.[0];
      const signer = node(file, upstream);
      assert.equal(signer.type, "n8n-nodes-base.crypto", `${file}: ${http.name} is fed by the signer`);
      assert.deepEqual([signer.parameters.action, signer.parameters.type, signer.parameters.encoding], ["hmac", "SHA256", "hex"]);
      assert.equal(signer.parameters.value, "={{ $json.payload }}");
      assert.equal(http.parameters.body, "={{ $json.payload }}", `${file}: the raw body is the signed string`);
      assert.equal(http.parameters.contentType, "raw");
      assert.deepEqual(http.parameters.headerParameters.parameters, [{ name: "X-Mortar-Signature", value: "=sha256={{ $json.signature }}" }]);
    }
  }
});

test("01 inbound email → a P1 case; a bad signature is rejected", async (t) => {
  const { app, send } = await mortar(t);
  const [item] = await runCode("01-inbound-email.json", "Build email event", [
    { from: "Maya Thompson <maya.t@example.com>", to: "maintenance@northwind.example", subject: "Leak!!", textPlain: "There is water coming through the ceiling.", date: app.clock.now().toISOString(), metadata: { "message-id": "<m1@mail.example>" } },
  ]);
  assert.equal((await send("/events", item, "wrong-secret")).status, 401);
  assert.equal((await send("/events", item)).status, 202);
  assert.equal((await send("/events", item)).status, 200, "a redelivered email is a duplicate, not a second case");
  await app.settle();
  assert.equal(onlyCase(app, "maintenance").priority, "P1");
});

test("02 weather → Mortar's SOP rule turns 'the heater stopped working' at 34°F into a P1", async (t) => {
  const { app, send } = await mortar(t);
  const observation = (celsius) => ({ properties: { temperature: { value: celsius, unitCode: "wmoUnit:degC" }, timestamp: app.clock.now().toISOString(), station: "https://api.weather.gov/stations/KAUS" } });
  assert.deepEqual(await runCode("02-weather-hourly.json", "Build weather update", [observation(null)]), [], "a missing reading sends nothing");
  const [item] = await runCode("02-weather-hourly.json", "Build weather update", [observation(1.1)]);
  assert.equal((await send("/directory/sync", item)).status, 200);
  assert.deepEqual(app.store.getKV("weather"), { tempF: 34, observedAt: app.clock.now().toISOString(), source: "NWS KAUS" });
  await sim.sms(app, { from: "+15125550142", body: "The heater stopped working" });
  await app.settle();
  assert.equal(onlyCase(app, "maintenance").priority, "P1");
});

test("03 ShowMojo lead → a leasing case; unrelated notifications are dropped", async (t) => {
  const { app, send } = await mortar(t);
  const lead = { body: { event_type: "new_lead", id: "L-77", listing_id: "SM-12CL", name: "Chris Ortiz", phone: "(512) 555-0188", email: "chris@example.com", message: "Is this still available? Do you allow cats?" } };
  assert.deepEqual(await runCode("03-showmojo-relay.json", "Map to leasing event", [{ body: { event_type: "listing_viewed" } }]), []);
  const [item] = await runCode("03-showmojo-relay.json", "Map to leasing event", [lead]);
  assert.equal((await send("/events", item)).status, 202);
  await app.settle();
  assert.equal(onlyCase(app, "leasing").playbook, "leasing");
});

test("04 Rentvine → only real status changes become events", async (t) => {
  const { app, send } = await mortar(t);
  const env = { RENTVINE_STATUS_IDS: JSON.stringify({ open: 1, in_progress: 2, completed: 3 }) };
  const staticData = {};
  const page = (status) => [{ data: [{ workOrder: { workOrderID: 5511, primaryWorkOrderStatusID: status, dateTimeModified: "2026-10-08 05:00:00" } }] }];
  assert.deepEqual(await runCode("04-rentvine-workorders.json", "Status changes only", page(2), { env, staticData }), [], "first sight is a baseline");
  assert.deepEqual(await runCode("04-rentvine-workorders.json", "Status changes only", page(2), { env, staticData }), [], "no change, no event");
  const [item] = await runCode("04-rentvine-workorders.json", "Status changes only", page(3), { env, staticData });
  assert.deepEqual(JSON.parse(item.json.payload), { id: "5511-3-2026-10-08 05:00:00", event: "workorder.updated", source: "rentvine", workOrderId: "5511", status: "completed", occurredAt: "2026-10-08 05:00:00" });
  assert.equal((await send("/events", item)).status, 202);
  await app.settle();
  assert.equal(app.store.listEvents({ limit: 5 }).find((e) => e.type === "workorder.updated").idempotencyKey, "rentvine:5511-3-2026-10-08 05:00:00");
});

test("05 on-call rota → Mortar's escalation ladder; a rota with a gap fails loudly", async (t) => {
  const { app, send } = await mortar(t);
  const csv = (rows) => [{ data: ["rota,level,staff_id", ...rows].join("\n") }];
  const [item] = await runCode("05-oncall-rota.json", "Build on-call ladder", csv(["after_hours,2,S-01", "after_hours,1,S-02", "business_hours,1,S-01"]));
  assert.equal((await send("/directory/sync", item)).status, 200);
  assert.deepEqual(app.store.getKV("oncall"), { afterHours: ["S-02", "S-01"], businessHours: ["S-01"] });
  await assert.rejects(runCode("05-oncall-rota.json", "Build on-call ladder", csv(["after_hours,1,S-02", "after_hours,3,S-01", "business_hours,1,S-01"])), /gap/);
});

test("06 nightly learning → a one-line summary", async () => {
  const [item] = await runCode("06-nightly-learning.json", "Summary", [{ promoted: true, version: 2, holdoutLogLoss: { current: 0.441, candidate: 0.272 }, liveSamples: 3 }]);
  assert.equal(item.json.text, "Lead scorer: promoted v2 · held-out log-loss 0.441 → 0.272 · 3 live outcomes");
});
