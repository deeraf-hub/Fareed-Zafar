import express from "express";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createLogger } from "./core/logger.js";
import { simulatedClock, systemClock } from "./core/clock.js";
import { openStore } from "./core/store.js";
import { createApp } from "./app.js";
import { seed } from "./demo/seed.js";
import { storyById, STORIES } from "./demo/stories.js";
import { createWebhooks } from "./http/webhooks.js";
import { createApi } from "./http/api.js";
import { metricsText } from "./http/metrics.js";

/**
 * Mortar server: webhooks in, console + API out, workers (outbox, scheduler) inside.
 *
 *   npm run demo   simulated clock + simulated systems + seeded directory, console at :4000
 *   npm start      real clock, persistent SQLite, connectors per env (see .env.example)
 */

const config = loadConfig();
const log = createLogger({ level: config.logLevel, format: config.logFormat });
const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));

function buildApp(start = config.clock.start) {
  const clock = config.clock.simulated ? simulatedClock(start, { realtime: true }) : systemClock();
  const store = openStore(config.demo ? ":memory:" : config.dbPath);
  if (config.demo || process.argv.includes("--seed")) seed(store, clock.now());
  const app = createApp({ config, clock, store, log });
  app.start();
  return app;
}

if (!config.demo) {
  if (!config.security.consoleToken) log.warn("CONSOLE_TOKEN is not set — the console API is open to anyone who can reach this port");
  if (!config.security.webhookSecret) log.warn("MORTAR_WEBHOOK_SECRET is not set — /events and /directory/sync will reject every request");
}

let app = buildApp();
const getApp = () => app;

// ── Demo stories: reset the world to a story's start time, then play it step by step ──
const resetListeners = new Set();
let story = null; // { id, index }
let running = false;

async function reset(start) {
  app.stop();
  app = buildApp(start ?? config.clock.start);
  for (const listener of resetListeners) listener();
  return { now: app.clock.now().toISOString() };
}

const stories = {
  state() {
    const list = STORIES.map((s) => ({ id: s.id, title: s.title, playbook: s.playbook, steps: s.steps.length }));
    if (!story) return { active: null, list };
    const s = storyById(story.id);
    const step = (i) => (s.steps[i] ? { title: s.steps[i].title, say: s.steps[i].say } : null);
    return { active: { id: s.id, title: s.title, index: story.index, total: s.steps.length, next: step(story.index), last: step(story.index - 1), running }, list };
  },
  async start(id) {
    const s = storyById(id);
    if (!s) throw new Error(`unknown story ${id}`);
    await reset(s.start);
    story = { id, index: 0 };
    return stories.state();
  },
  async next() {
    if (!story) throw new Error("start a story first");
    if (running) return stories.state();
    const s = storyById(story.id);
    const step = s.steps[story.index];
    if (!step) return stories.state();
    running = true;
    try {
      await step.run(app);
      await app.settle();
      story.index += 1;
    } finally {
      running = false;
    }
    app.bus.emit("story", stories.state());
    return stories.state();
  },
  onReset: (fn) => resetListeners.add(fn),
  offReset: (fn) => resetListeners.delete(fn),
};

// ── HTTP ─────────────────────────────────────────────────────────────────────

const http = express();
http.disable("x-powered-by");

http.get("/healthz", (_req, res) => res.json({ ok: true, now: app.clock.now().toISOString(), demo: config.demo }));
http.get("/metrics", (_req, res) => res.type("text/plain; version=0.0.4").send(metricsText(app)));

http.use(createWebhooks({ getApp, config }));
http.use("/api", createApi({ getApp, reset, config, stories }));
http.use(express.static(PUBLIC_DIR));

http.listen(config.port, async () => {
  const providers = await app.router.status();
  const tier = (t) => (providers[t].available ? `${providers[t].provider}:${providers[t].model}` : `off (${providers[t].detail})`);
  log.info(`Mortar is running → http://localhost:${config.port}`, {
    mode: config.demo ? "demo (simulated clock + systems)" : "live",
    local: tier("local"),
    frontier: tier("frontier"),
    connectors: Object.entries(app.modes).map(([k, v]) => `${k}:${v}`).join(" "),
  });
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    log.info("shutting down");
    app.stop();
    process.exit(0);
  });
}
