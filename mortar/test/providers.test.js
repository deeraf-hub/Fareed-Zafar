import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { anthropicProvider } from "../src/models/providers/anthropic.js";

// The frontier model is configuration: pinned with FRONTIER_MODEL, or discovered from the
// Models API (newest first). These tests use a fake client and made-up model ids.

const caps = (structured = true, effort = true) => ({ structured_outputs: { supported: structured }, effort: { supported: effort } });

function fakeClient(models, { failList = false } = {}) {
  const calls = { list: 0, parse: [] };
  return {
    calls,
    models: {
      list() {
        calls.list += 1;
        if (failList) throw new Error("network down");
        return (async function* () {
          yield* models;
        })();
      },
    },
    beta: {
      messages: {
        async parse(params) {
          calls.parse.push(params);
          return { model: params.model, stop_reason: "end_turn", parsed_output: { ok: true }, usage: { input_tokens: 1000, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } };
        },
      },
    },
  };
}

const request = { system: "s", prompt: "p", schema: z.object({ ok: z.boolean() }), maxTokens: 200, effort: "low" };

test("unpinned: picks the newest model in the family that supports structured outputs", async () => {
  const client = fakeClient([
    { id: "test-sonnet-9", capabilities: caps() },
    { id: "test-opus-9", capabilities: caps(false) }, // newest opus, but no structured outputs
    { id: "test-opus-8", capabilities: caps() },
    { id: "test-opus-7", capabilities: caps() },
  ]);
  const p = anthropicProvider({ apiKey: "k", client, price: { input: 10, output: 50 } });
  assert.match(p.model, /^auto/);
  const res = await p.complete(request);
  assert.equal(client.calls.parse[0].model, "test-opus-8");
  assert.equal(client.calls.parse[0].output_config.effort, "low");
  assert.equal(res.model, "test-opus-8");
  assert.equal(res.costUsd, (1000 * 10 + 100 * 50) / 1e6, "cost uses the configured tier price");
  await p.complete(request);
  assert.equal(client.calls.list, 1, "discovered once, then remembered");
  assert.equal(p.model, "test-opus-8");
});

test("pinned: FRONTIER_MODEL is used as-is and the Models API is never called", async () => {
  const client = fakeClient([{ id: "test-opus-9", capabilities: caps() }]);
  const p = anthropicProvider({ apiKey: "k", client, model: "test-opus-pinned" });
  await p.complete(request);
  assert.equal(client.calls.parse[0].model, "test-opus-pinned");
  assert.equal(client.calls.list, 0);
});

test("discovery failure: health reports it, and the Models API isn't hammered", async () => {
  const client = fakeClient([], { failList: true });
  const p = anthropicProvider({ apiKey: "k", client });
  const first = await p.health();
  assert.equal(first.ok, false);
  assert.match(first.detail, /network down/);
  assert.equal((await p.health()).ok, false);
  assert.equal(client.calls.list, 1, "a failed lookup is cached for a minute");
  assert.equal((await anthropicProvider({ client }).health()).detail, "ANTHROPIC_API_KEY is not set");
});
