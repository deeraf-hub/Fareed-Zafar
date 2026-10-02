import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createRetriever } from "../src/knowledge/retriever.js";

const dir = fileURLToPath(new URL("../data/knowledge", import.meta.url));

test("retrieval is scoped: one building's notes never answer for another", async () => {
  const r = createRetriever({ dir });
  // As the maintenance playbook asks it: this building only.
  const maple = await r.search("unit water shutoff valve location kitchen sink", { scopes: ["property:P-1001"], limit: 1 });
  assert.equal(maple.results[0].section, "Water shutoff valves");
  assert.match(maple.results[0].text, /under the kitchen sink/);
  const cedar = await r.search("unit water shutoff valve location kitchen sink", { scopes: ["property:P-2001"], limit: 3 });
  assert.ok(cedar.results.every((x) => x.scope === "property:P-2001"), "Cedar Lane never sees Maple Court's guide");
  // Mixed scopes (long-tail leasing answers): the other building is still invisible.
  const mixed = await r.search("lockbox key basement utility room", { scopes: ["property:P-2001", "global"], limit: 5 });
  assert.ok(mixed.results.every((x) => x.scope !== "property:P-1001"));
});

test("retrieval respects the caller's token budget", async () => {
  const r = createRetriever({ dir });
  const res = await r.search("pets deposit application fee lease", { scopes: ["global"], limit: 5, budgetTokens: 120 });
  assert.ok(res.results.length >= 1);
  assert.ok(res.tokens <= 120 || res.results.length === 1, "only the first chunk may exceed a tiny budget");
});

test("embeddings are a second signal, never a dependency", async () => {
  const lexical = await createRetriever({ dir }).search("shutoff valve", { scopes: ["global", "property:P-1001"] });
  const broken = createRetriever({ dir, embedder: async () => { throw new Error("ollama down"); } });
  const degraded = await broken.search("shutoff valve", { scopes: ["global", "property:P-1001"] });
  assert.deepEqual(degraded.results.map((x) => x.id), lexical.results.map((x) => x.id), "falls back to BM25 alone");

  const fake = createRetriever({ dir, embedder: async (text) => [text.length % 7, /valve/i.test(text) ? 1 : 0, 1] });
  const fused = await fake.search("shutoff valve", { scopes: ["global", "property:P-1001"] });
  assert.ok(fused.results.length >= 1);
});
