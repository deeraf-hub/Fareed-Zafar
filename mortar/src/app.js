import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createLogger } from "./core/logger.js";
import { simulatedClock, systemClock } from "./core/clock.js";
import { openStore } from "./core/store.js";
import { createBus } from "./core/bus.js";
import { createDirectory } from "./core/directory.js";
import { createPolicy } from "./core/policy.js";
import { createPipeline } from "./core/pipeline.js";
import { createProcessor } from "./core/processor.js";
import { createOutbox } from "./core/outbox.js";
import { createScheduler } from "./core/scheduler.js";
import { createSimulatedWorld } from "./connectors/simulated.js";
import { createConnectors } from "./connectors/index.js";
import { createProviders } from "./models/index.js";
import { createModelRouter } from "./models/router.js";
import { createTaskRegistry } from "./models/task.js";
import { createRetriever, ollamaEmbedder } from "./knowledge/retriever.js";
import { createPlaybooks } from "./playbooks/index.js";
import { maintenance } from "./playbooks/maintenance/index.js";
import { leasing } from "./playbooks/leasing/index.js";
import { leadgen } from "./playbooks/leadgen/index.js";

const KNOWLEDGE_DIR = fileURLToPath(new URL("../data/knowledge", import.meta.url));

/**
 * Composition root: builds the whole runtime from config. Every dependency can be
 * overridden (tests inject a manual clock, scripted model providers, a silent logger).
 */
export function createApp(overrides = {}) {
  const config = overrides.config ?? loadConfig();
  const log = overrides.log ?? createLogger({ level: config.logLevel, format: config.logFormat });
  const clock = overrides.clock ?? (config.clock.simulated ? simulatedClock(config.clock.start, { realtime: true }) : systemClock());
  const store = overrides.store ?? openStore(config.dbPath);
  const bus = createBus(log);

  const world = createSimulatedWorld({ clock, onChange: (change) => bus.emit("world", change) });
  const { connectors, modes } = createConnectors(config, world);
  const directory = createDirectory(store);
  const playbooks = createPlaybooks({ store, directory, clock, list: overrides.playbooks ?? [maintenance, leasing, leadgen] });
  const tasks = createTaskRegistry(playbooks.tasks());
  const providers = overrides.providers ?? createProviders(config.models);
  const router = createModelRouter({ store, clock, providers, tasks, log, config: config.models });
  const { embeddings } = config.models;
  const embedder = embeddings?.provider === "ollama" && embeddings.model ? ollamaEmbedder({ url: config.models.local.ollamaUrl, model: embeddings.model }) : null;
  const retriever = overrides.retriever ?? createRetriever({ dir: KNOWLEDGE_DIR, embedder, log });
  const policy = createPolicy({ store, timezone: config.timezone });
  const pipeline = createPipeline({ store, clock, router, retriever, policy, playbooks, directory, log, emit: bus.emit, frontierPrice: config.models.frontier.price });
  const processor = createProcessor({ store, clock, pipeline, log, emit: bus.emit });
  const outbox = createOutbox({
    store,
    clock,
    connectors,
    ingest: processor.ingest,
    log,
    maxAttempts: config.outbox.maxAttempts,
    pollMs: config.outbox.pollMs,
    onChange: (caseId) => bus.emit("outbox", { caseId }),
  });
  const scheduler = createScheduler({ store, clock, ingest: processor.ingest, log, pollMs: config.scheduler.pollMs });

  /**
   * Run until there is nothing left to do right now: queued events, due actions,
   * due timers. Refuses to spin forever — an agent that keeps generating work for
   * itself is a bug worth failing loudly on.
   */
  async function settle() {
    for (let round = 0; round < 200; round++) {
      await processor.idle();
      const nowIso = clock.now().toISOString();
      const actionsDue = store.dueActions(nowIso, 1).length > 0;
      const timersDue = store.dueTimers(nowIso, 1).length > 0;
      if (!actionsDue && !timersDue) return;
      if (actionsDue) await outbox.drain();
      if (timersDue) await scheduler.tick();
    }
    const nowIso = clock.now().toISOString();
    const stuck = [...store.dueActions(nowIso, 5).map((a) => `action "${a.label}" (${a.status}, try ${a.attempts})`), ...store.dueTimers(nowIso, 5).map((t) => `timer ${t.kind}`)];
    throw new Error(`settle() did not converge — the agent keeps creating work for itself. Still due: ${stuck.join("; ") || "nothing"}`);
  }

  /**
   * Simulated clock only: jump forward, stopping at every timer and deferred action
   * along the way so follow-ups happen in the right order with the right "now".
   */
  async function fastForward(ms) {
    if (!clock.simulated) throw new Error("fastForward needs a simulated clock");
    const target = clock.now().getTime() + ms;
    await settle();
    for (let step = 0; step < 500; step++) {
      const candidates = [store.nextTimerDue(), store.nextActionDue()].filter(Boolean).map(Date.parse);
      const next = Math.min(...candidates);
      if (!candidates.length || next > target) break;
      if (next > clock.now().getTime()) clock.set(new Date(next).toISOString());
      await settle();
    }
    clock.set(new Date(target).toISOString());
    await settle();
  }

  return {
    config,
    log,
    clock,
    store,
    bus,
    world,
    connectors,
    modes,
    directory,
    playbooks,
    tasks,
    router,
    retriever,
    policy,
    pipeline,
    processor,
    outbox,
    scheduler,
    ingest: processor.ingest,
    settle,
    fastForward,
    start() {
      processor.recover();
      outbox.start();
      scheduler.start();
    },
    stop() {
      outbox.stop();
      scheduler.stop();
    },
  };
}
