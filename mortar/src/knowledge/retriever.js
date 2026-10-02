import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIndex } from "./bm25.js";
import { estimateTokens } from "../models/tokens.js";

/**
 * Knowledge retrieval for the unstructured part of context: building guides,
 * SOPs, listing details, leasing and service policies (markdown in data/knowledge).
 *
 * Most context in Mortar is structured and comes from SQL lookups (unit → property →
 * owner, vendor roster, approval limits). This retriever handles the rest:
 *
 *   1. filter  — scope first: only this property's docs + global docs. A building's
 *                lockbox notes can never leak into another property's answers.
 *   2. rank    — BM25 (+ optional embeddings, fused with reciprocal rank fusion)
 *   3. rerank  — property-specific chunks outrank generic ones on ties
 *   4. budget  — return only as many chunks as fit the caller's token budget
 */
export function createRetriever({ dir, embedder = null, log = null }) {
  const chunks = loadChunks(dir);
  const index = buildIndex(chunks);
  let vectors = null; // lazily computed when an embedder is configured

  async function search(query, { scopes = ["global"], limit = 3, budgetTokens = 450 } = {}) {
    const inScope = (doc) => scopes.includes(doc.scope);
    const lexical = index.search(query, { filter: inScope, limit: 10 });

    let ranked = lexical.map((r) => ({ ...r }));
    if (embedder) {
      try {
        ranked = await fuseWithEmbeddings(query, ranked, inScope);
      } catch (err) {
        // Embeddings are a second signal, never a dependency: fall back to BM25.
        log?.warn("embeddings unavailable — lexical retrieval only", { error: err.message });
      }
    }

    ranked = ranked
      .map((r) => ({ ...r, score: r.score * (r.doc.scope.startsWith("property:") ? 1.3 : 1) }))
      .sort((a, b) => b.score - a.score);

    const results = [];
    let used = 0;
    for (const { doc, score } of ranked) {
      if (results.length >= limit) break;
      const tokens = estimateTokens(doc.text);
      if (used + tokens > budgetTokens && results.length > 0) break;
      results.push({ id: doc.id, title: doc.title, section: doc.section, scope: doc.scope, text: doc.text, score: round(score), tokens });
      used += tokens;
    }
    return { query, results, tokens: used };
  }

  /** Hybrid ranking: reciprocal rank fusion of BM25 and cosine similarity. */
  async function fuseWithEmbeddings(query, lexical, inScope) {
    vectors ??= await Promise.all(chunks.map(async (c) => ({ doc: c, v: await embedder(`${c.title} ${c.section} ${c.text}`) })));
    const q = await embedder(query);
    const semantic = vectors
      .filter((x) => inScope(x.doc))
      .map((x) => ({ doc: x.doc, score: cosine(q, x.v) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    const fused = new Map();
    const add = (list) =>
      list.forEach((r, rank) => {
        const prev = fused.get(r.doc.id) ?? { doc: r.doc, score: 0 };
        prev.score += 1 / (60 + rank);
        fused.set(r.doc.id, prev);
      });
    add(lexical);
    add(semantic);
    return [...fused.values()];
  }

  return { search, size: chunks.length, chunks };
}

/** Ollama embeddings (e.g. nomic-embed-text) — optional second retrieval signal. */
export function ollamaEmbedder({ url, model }) {
  return async (text) => {
    const res = await fetch(`${url}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, input: text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Embedding failed: HTTP ${res.status}`);
    const body = await res.json();
    return body.embeddings[0];
  };
}

// ── Loading & chunking ─────────────────────────────────────────────────────────

function loadChunks(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  return files.flatMap((file) => chunkMarkdown(file, readFileSync(join(dir, file), "utf8")));
}

/** Split on "## " headings; each chunk keeps its document title and scope. */
export function chunkMarkdown(file, raw) {
  const { meta, body } = frontmatter(raw);
  const title = meta.title ?? file.replace(/\.md$/, "");
  const scope = meta.scope ?? "global";
  const [intro, ...sections] = body.split(/^## /m);
  const parts = sections.map((section) => {
    const [heading, ...rest] = section.split("\n");
    return { section: heading.trim(), text: rest.join("\n").trim() };
  });
  if (intro.trim()) parts.unshift({ section: "Overview", text: intro.trim() });
  return parts.map((part, i) => ({ id: `${file.replace(/\.md$/, "")}#${i + 1}`, file, title, scope, ...part }));
}

function frontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: raw };
  const meta = Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => line.match(/^(\w+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, k, v]) => [k, v.trim()])
  );
  return { meta, body: raw.slice(match[0].length) };
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

const round = (n) => Math.round(n * 1000) / 1000;
