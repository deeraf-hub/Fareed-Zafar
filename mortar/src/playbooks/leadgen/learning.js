/**
 * Lead generation — scoring and learning. Plain math, no LLM.
 *
 *   features(record)   → 0/1 intent signals derived from property + owner data
 *   score(features, w) → logistic probability of a booked meeting, 0–100, with the
 *                        per-feature contributions (so every score is explainable)
 *   train(samples)     → refit the weights from campaign outcomes (L2-regularized
 *                        logistic regression, gradient descent)
 *   bandit             → Thompson sampling over message variants, per tier
 *
 * The learning loop: outcomes (positive reply, meeting, signed) update the bandit
 * immediately and are added to the training set; a learning cycle refits the weights
 * and promotes them only if they beat the current weights on held-out data.
 */

export const FEATURES = {
  absentee: "Owner's mailing address is out of state",
  listedForRent: "A property is listed for rent right now",
  domOver30: "Listed for rent 30+ days (vacancy pain)",
  priceCut: "Rent has been cut while listed",
  selfManaged: "Listed by owner / no manager on record",
  doors2to10: "Owns 2–10 doors (our sweet spot)",
  recentPurchase: "Bought in the last 12 months",
  evictionFiling: "Eviction filing in the last 24 months",
  codeViolation: "Code violation in the last 12 months",
};

/** Expert priors, used until there is enough outcome data to learn from. */
export const PRIOR_WEIGHTS = {
  version: 0,
  trainedOn: 0,
  bias: -2.6,
  w: { absentee: 1.0, listedForRent: 0.5, domOver30: 1.1, priceCut: 0.7, selfManaged: 0.8, doors2to10: 0.5, recentPurchase: 0.4, evictionFiling: 0.6, codeViolation: 0.3 },
};

/** Uninformed Beta(1,1) priors for each subject-line variant. */
export const DEFAULT_ARMS = { V1: { a: 1, b: 1 }, V2: { a: 1, b: 1 }, V3: { a: 1, b: 1 } };

export const TIERS = [
  { tier: "A", min: 70 },
  { tier: "B", min: 30 },
  { tier: "C", min: 0 },
];

export function features(record, now = new Date()) {
  const props = record.properties ?? [];
  const listed = props.filter((p) => p.listedForRent);
  const months = record.purchaseDate ? (now - new Date(record.purchaseDate)) / (30.4 * 86400000) : Infinity;
  return {
    absentee: record.mailing?.state && record.mailing.state !== "TX" ? 1 : 0,
    listedForRent: listed.length ? 1 : 0,
    domOver30: listed.some((p) => p.daysOnMarket > 30) ? 1 : 0,
    priceCut: listed.some((p) => (p.priceCuts ?? 0) > 0) ? 1 : 0,
    selfManaged: !record.currentManager || listed.some((p) => p.listedBy === "owner") ? 1 : 0,
    doors2to10: record.doors >= 2 && record.doors <= 10 ? 1 : 0,
    recentPurchase: months <= 12 ? 1 : 0,
    evictionFiling: (record.evictionFilings24m ?? 0) > 0 ? 1 : 0,
    codeViolation: (record.codeViolations12m ?? 0) > 0 ? 1 : 0,
  };
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

export function score(x, weights = PRIOR_WEIGHTS) {
  let z = weights.bias;
  const contributions = [];
  for (const [name, value] of Object.entries(x)) {
    const w = weights.w[name] ?? 0;
    z += w * value;
    if (value) contributions.push({ feature: name, label: FEATURES[name], weight: round(w) });
  }
  const probability = sigmoid(z);
  const points = Math.round(probability * 100);
  return { probability, score: points, tier: TIERS.find((t) => points >= t.min).tier, contributions: contributions.sort((a, b) => b.weight - a.weight) };
}

/**
 * L2-regularized logistic regression by batch gradient descent, warm-started from the
 * current weights. Loss = mean log-loss + (l2 / 2n)·‖w‖². Deterministic.
 */
export function train(samples, { init = PRIOR_WEIGHTS, l2 = 1, epochs = 4000, lr = 1 } = {}) {
  const names = Object.keys(FEATURES);
  let bias = init.bias;
  const w = Object.fromEntries(names.map((n) => [n, init.w[n] ?? 0]));
  const n = samples.length || 1;
  for (let epoch = 0; epoch < epochs; epoch++) {
    let gBias = 0;
    const g = Object.fromEntries(names.map((k) => [k, 0]));
    for (const { x, y } of samples) {
      const p = sigmoid(bias + names.reduce((z, k) => z + w[k] * x[k], 0));
      const err = p - y;
      gBias += err;
      for (const k of names) g[k] += err * x[k];
    }
    bias -= (lr * gBias) / n;
    for (const k of names) w[k] -= lr * (g[k] + l2 * w[k]) / n;
  }
  return { version: (init.version ?? 0) + 1, trainedOn: samples.length, bias: round(bias), w: Object.fromEntries(names.map((k) => [k, round(w[k])])) };
}

export function logLoss(samples, weights) {
  const eps = 1e-9;
  const total = samples.reduce((sum, { x, y }) => {
    const p = score(x, weights).probability;
    return sum - (y * Math.log(p + eps) + (1 - y) * Math.log(1 - p + eps));
  }, 0);
  return total / (samples.length || 1);
}

/**
 * One learning cycle: refit on the training split, compare with the current weights
 * on the held-out split, promote only if the new weights are better.
 */
export function learningCycle(samples, current) {
  const holdout = samples.filter((_, i) => i % 5 === 0);
  const training = samples.filter((_, i) => i % 5 !== 0);
  const candidate = train(training, { init: current });
  const before = logLoss(holdout, current);
  const after = logLoss(holdout, candidate);
  const promoted = after < before;
  return {
    promoted,
    weights: promoted ? { ...candidate, trainedAt: new Date().toISOString() } : current,
    report: {
      samples: samples.length,
      holdoutLogLoss: { current: round(before), candidate: round(after) },
      changes: Object.keys(FEATURES).map((k) => ({ feature: k, label: FEATURES[k], from: current.w[k], to: candidate.w[k] })),
    },
  };
}

// ── Thompson sampling over message variants ──────────────────────────────────

/** Mulberry32 — a tiny seeded PRNG so variant choice is reproducible in tests. */
export function seededRandom(seed) {
  let a = typeof seed === "number" ? seed : [...String(seed)].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 1779033703);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleGamma(k, rng) {
  // Marsaglia & Tsang (k ≥ 1); boost for k < 1.
  if (k < 1) return sampleGamma(k + 1, rng) * Math.pow(rng(), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x;
    let v;
    do {
      const u1 = rng();
      const u2 = rng();
      x = Math.sqrt(-2 * Math.log(u1 || 1e-12)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBeta(a, b, rng) {
  const x = sampleGamma(a, rng);
  const y = sampleGamma(b, rng);
  return x / (x + y);
}

/** Pick the variant whose sampled success rate is highest. arms: { id: { a, b } } */
export function thompsonPick(arms, rng) {
  let best = null;
  for (const [id, { a, b }] of Object.entries(arms)) {
    const draw = sampleBeta(a, b, rng);
    if (!best || draw > best.draw) best = { id, draw };
  }
  return best.id;
}

const round = (n) => Math.round(n * 1000) / 1000;
