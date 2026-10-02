import { loadConfig } from "../src/config.js";
import { createApp } from "../src/app.js";
import { simulatedClock } from "../src/core/clock.js";
import { openStore } from "../src/core/store.js";
import { silentLogger } from "../src/core/logger.js";
import { simulatedProvider } from "../src/models/providers/simulated.js";
import { seed } from "../src/demo/seed.js";

/** Wednesday 11:30 PM in Austin (CDT, UTC−5). */
export const WED_2330 = "2026-10-08T04:30:00Z";

/**
 * A fully wired app for tests: in-memory store, demo directory, a clock that only
 * moves when told to, simulated connectors and simulated model tiers — regardless of
 * whatever is in the developer's environment.
 */
export function testApp({ start = WED_2330, providers, playbooks } = {}) {
  const base = loadConfig(["--demo"]);
  const connectors = Object.fromEntries(
    Object.entries(base.connectors).map(([k, v]) => [k, v && typeof v === "object" && "mode" in v ? { ...v, mode: "simulated" } : v])
  );
  const config = { ...base, connectors, dbPath: ":memory:" };
  const clock = simulatedClock(start, { realtime: false });
  const store = openStore(":memory:");
  seed(store, clock.now());
  return createApp({
    config,
    clock,
    store,
    log: silentLogger,
    playbooks,
    providers: providers ?? {
      local: simulatedProvider({ tier: "local" }),
      frontier: simulatedProvider({ tier: "frontier" }),
    },
  });
}

export const stage = (trace, key) => trace.stages.find((s) => s.key === key);
export const messagesTo = (app, address) => app.world.state.messages.filter((m) => m.direction === "outbound" && m.to === address);
export const callsTo = (app, phone) => app.world.state.calls.filter((c) => c.to === phone);
export const onlyCase = (app, playbook) => {
  const cases = app.store.listCases({ playbook });
  if (cases.length !== 1) throw new Error(`expected 1 ${playbook} case, found ${cases.length}`);
  return cases[0];
};
