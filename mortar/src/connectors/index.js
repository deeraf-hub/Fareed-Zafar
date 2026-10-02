import { twilioConnector } from "./twilio.js";
import { followUpBossConnector } from "./followupboss.js";
import { rentvineConnector } from "./rentvine.js";
import { postmarkConnector } from "./email.js";

/**
 * One switch per system: "simulated" (default) or "live". Mixing is fine — e.g. live
 * Follow Up Boss with simulated Twilio while you test against a real CRM sandbox.
 * ShowMojo is inbound-only here (its leads/showings webhook arrives via n8n).
 */
export function createConnectors({ connectors: cfg, publicBaseUrl }, world) {
  const sim = world.connectors;
  const pick = (mode, live, simulated, name) => {
    if (mode !== "live") return { impl: simulated, mode: "simulated" };
    return { impl: live(), mode: "live", name };
  };

  const chosen = {
    twilio: pick(cfg.twilio.mode, () => twilioConnector({ ...cfg.twilio, publicBaseUrl }), sim.twilio),
    email: pick(cfg.email.mode, () => postmarkConnector({ serverToken: cfg.email.postmarkToken, from: cfg.email.from }), sim.email),
    fub: pick(cfg.fub.mode, () => followUpBossConnector(cfg.fub), sim.fub),
    rentvine: pick(cfg.rentvine.mode, () => rentvineConnector(cfg.rentvine), sim.rentvine),
  };

  // Enrichment providers are vendor-specific (BatchData, PDL, Apollo…); plug one in here.
  chosen.enrichment = { impl: sim.enrichment, mode: "simulated" };

  return {
    connectors: Object.fromEntries(Object.entries(chosen).map(([k, v]) => [k, v.impl])),
    modes: Object.fromEntries(Object.entries(chosen).map(([k, v]) => [k, v.mode])),
  };
}
