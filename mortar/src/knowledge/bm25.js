/**
 * BM25 lexical ranking — small, fast, and explainable. For property manuals and SOPs
 * ("where is the water shutoff?") exact terms matter more than semantic similarity,
 * so lexical search does most of the work; embeddings are an optional second signal.
 */

const STOPWORDS = new Set(
  "a an and are as at be but by for from has have i if in into is it its me my no not of on or our so that the their them there these they this to was we were what when where which who will with you your".split(" ")
);

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

/** A deliberately light stemmer: valves→valve, leaking/leaked→leak, ceilings→ceil(ing). */
function stem(token) {
  let t = token;
  if (t.length > 3 && t.endsWith("s") && !/(ss|us|is)$/.test(t)) t = t.slice(0, -1);
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 5 && t.endsWith("ed")) return t.slice(0, -2);
  return t;
}

export function buildIndex(docs, { k1 = 1.2, b = 0.75 } = {}) {
  const entries = docs.map((doc) => {
    const terms = tokenize(`${doc.title} ${doc.section ?? ""} ${doc.text}`);
    const tf = new Map();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { doc, tf, length: terms.length };
  });
  const df = new Map();
  for (const e of entries) for (const t of e.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLength = entries.reduce((sum, e) => sum + e.length, 0) / Math.max(entries.length, 1);
  const n = entries.length;

  function score(entry, queryTerms) {
    let s = 0;
    for (const t of queryTerms) {
      const f = entry.tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (n - df.get(t) + 0.5) / (df.get(t) + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * entry.length) / avgLength)));
    }
    return s;
  }

  return {
    size: n,
    search(query, { filter = () => true, limit = 5 } = {}) {
      const q = [...new Set(tokenize(query))];
      return entries
        .filter((e) => filter(e.doc))
        .map((e) => ({ doc: e.doc, score: score(e, q) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
  };
}
