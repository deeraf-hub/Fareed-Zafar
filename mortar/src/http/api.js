import express from "express";
import * as sim from "../demo/simulate.js";
import { STORIES, storyById } from "../demo/stories.js";
import { PROSPECTS } from "../demo/seed.js";
import { runLearningCycle } from "../playbooks/leadgen/learning-cycle.js";
import { MINUTE } from "../core/clock.js";
import { snapshot, caseDetail } from "./snapshot.js";

/**
 * Console API. Read endpoints work in every mode; the "play the other side" endpoints
 * (simulate, stories, clock, failure injection, reset) exist only in demo mode.
 */
export function createApi({ getApp, reset, config, stories }) {
  const router = express.Router();
  router.use(express.json());

  if (config.security.consoleToken) {
    router.use((req, res, next) => (req.get("authorization") === `Bearer ${config.security.consoleToken}` || req.query.token === config.security.consoleToken ? next() : res.sendStatus(401)));
  }

  const wrap = (fn) => async (req, res) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) res.json(result ?? { ok: true });
    } catch (err) {
      getApp().log.error("api error", { path: req.path, error: err.message });
      res.status(400).json({ error: err.message });
    }
  };

  router.get("/state", wrap(async () => snapshot(getApp(), { stories: stories.state() })));
  router.get("/cases/:id", wrap(async (req) => caseDetail(getApp(), req.params.id)));

  /** Server-Sent Events: the console refreshes whenever something happens. */
  router.get("/stream", (req, res) => {
    res.set({ "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.flushHeaders();
    let unsubscribe = getApp().bus.subscribe((type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data ?? {})}\n\n`));
    const onReset = () => {
      unsubscribe();
      unsubscribe = getApp().bus.subscribe((type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data ?? {})}\n\n`));
      res.write("event: reset\ndata: {}\n\n");
    };
    stories.onReset(onReset);
    const ping = setInterval(() => res.write(": ping\n\n"), 15000);
    req.on("close", () => {
      clearInterval(ping);
      unsubscribe();
      stories.offReset(onReset);
    });
  });

  /** Approve / reject (optionally with edits) a held action. */
  router.post(
    "/approvals/:id",
    wrap(async (req) => {
      const app = getApp();
      const approval = app.store.getApproval(req.params.id);
      if (!approval || approval.status !== "pending") throw new Error("approval is not pending");
      await sim.decideApproval(app, { approvalId: approval.id, decision: req.body.decision === "approved" ? "approved" : "rejected", by: req.body.by ?? "Console user", edits: req.body.edits ?? {} });
      await app.settle();
    })
  );

  /** A person replies directly from the console → takes over the conversation. */
  router.post(
    "/cases/:id/takeover",
    wrap(async (req) => {
      const app = getApp();
      const c = app.store.getCase(req.params.id);
      if (!c) throw new Error("case not found");
      app.store.saveCase({ ...c, flags: { ...c.flags, humanInControl: req.body.release ? false : true }, updatedAt: app.clock.now().toISOString() });
      app.store.appendLog(c.id, { at: app.clock.now().toISOString(), kind: "note", actor: `human:${req.body.by ?? "Console user"}`, text: req.body.release ? "Handed back to the agent" : "A person took over this conversation — the agent now drafts, a person sends" });
      app.bus.emit("case", c.id);
    })
  );

  router.post("/leadgen/learn", wrap(async () => runLearningCycle(getApp().store, getApp().clock.now())));

  if (!config.demo) return router;

  // ── Demo-only: play the other side, move time, break things on purpose ────────

  router.post(
    "/clock/advance",
    wrap(async (req) => {
      await getApp().fastForward(Number(req.body.minutes ?? 10) * MINUTE);
      return { now: getApp().clock.now().toISOString() };
    })
  );

  router.post(
    "/simulate/:kind",
    wrap(async (req) => {
      const app = getApp();
      const b = req.body;
      switch (req.params.kind) {
        case "sms":
          await sim.sms(app, { from: b.from, to: b.to, body: b.body });
          break;
        case "email":
          await sim.email(app, { from: b.from, to: b.to, subject: b.subject ?? "Re:", body: b.body });
          break;
        case "keypress":
          await sim.keypress(app, { phone: b.phone, digits: String(b.digits) });
          break;
        case "rentvine":
          await sim.rentvineWorkOrder(app, { workOrderId: b.workOrderId, status: b.status });
          break;
        case "discover":
          await sim.discover(app, PROSPECTS.records);
          break;
        default:
          throw new Error(`unknown simulation ${req.params.kind}`);
      }
      await app.settle();
    })
  );

  router.post("/stories/:id/start", wrap(async (req) => stories.start(req.params.id)));
  router.post("/stories/next", wrap(async () => stories.next()));

  /** Make the next N calls to a connector operation fail with a 503 (watch the retries). */
  router.post(
    "/failures",
    wrap(async (req) => {
      getApp().world.injectFailures(req.body.operation, Number(req.body.count ?? 2));
      return { injected: req.body };
    })
  );

  /** Take a model tier down (or bring it back) to watch fallbacks and the circuit breaker. */
  router.post(
    "/models/:tier",
    wrap(async (req) => {
      const app = getApp();
      const tier = req.params.tier;
      app.router.providers[tier] = req.body.down ? brokenProvider(tier, app.router.providers[tier]) : app.router.providers[tier]?.original ?? app.router.providers[tier];
      return await app.router.status();
    })
  );

  router.post("/reset", wrap(async () => reset()));
  router.get("/stories", wrap(async () => STORIES.map(({ id, title, playbook, steps }) => ({ id, title, playbook, steps: steps.length }))));
  router.get("/stories/:id", wrap(async (req) => storyById(req.params.id)));

  return router;
}

function brokenProvider(tier, original) {
  if (!original || original.broken) return original;
  return {
    ...original,
    broken: true,
    original,
    async complete() {
      throw Object.assign(new Error(`${tier} model is down (simulated outage)`), { kind: "error" });
    },
    async health() {
      return { ok: false, detail: "simulated outage" };
    },
  };
}
