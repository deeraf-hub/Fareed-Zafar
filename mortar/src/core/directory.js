import { localParts } from "./clock.js";

/**
 * Directory lookups the playbooks use for deterministic decisions: who is this,
 * which unit is above, which vendors cover this trade after hours, who is on call.
 * All local SQL — no third-party API round-trips and no model calls on the hot path.
 */
export function createDirectory(store) {
  return {
    party: (id) => (id ? store.getParty(id) : null),
    property: (id) => (id ? store.getProperty(id) : null),
    unit: (id) => (id ? store.getUnit(id) : null),
    byPhone: (phone) => (phone ? store.findPartyByPhone(phone) : null),
    byEmail: (email) => (email ? store.findPartyByEmail(email) : null),
    tenantsOf: (unitId) => store.tenantsOfUnit(unitId),

    propertyByListing: (listingId) => (listingId ? store.findPropertyByExternal("showmojo", listingId) : null),
    unitsOf: (propertyId) => store.sql("SELECT id FROM units WHERE property_id = ?").all(propertyId).map((r) => store.getUnit(r.id)),

    unitAbove(unit) {
      return unit?.aboveUnitId ? store.getUnit(unit.aboveUnitId) : null;
    },

    /** Vendors for a trade, best first; after hours only those who take emergency calls. */
    vendorsFor(trade, { afterHours = false } = {}) {
      return store
        .listParties({ role: "vendor" })
        .filter((v) => v.attributes.trades?.includes(trade) && (!afterHours || v.attributes.afterHours))
        .sort((a, b) => (a.attributes.priority ?? 9) - (b.attributes.priority ?? 9));
    },

    /** The escalation ladder in effect right now (after-hours vs business-hours rota). */
    onCallLadder({ afterHours }) {
      const rota = store.getKV("oncall", { afterHours: [], businessHours: [] });
      return (afterHours ? rota.afterHours : rota.businessHours).map((id) => store.getParty(id)).filter(Boolean);
    },

    /**
     * Latest outside temperature (°F) from the weather feed n8n refreshes hourly, or null
     * when there is none or it is older than 3 hours — stale weather must not set severity.
     */
    outsideTempF(now) {
      const w = store.getKV("weather", null);
      if (!w || typeof w.tempF !== "number" || !w.observedAt) return null;
      return now.getTime() - Date.parse(w.observedAt) <= 3 * 3600_000 ? w.tempF : null;
    },

    /** Read-only access to learned state (scoring weights, bandit posteriors, suppression list). */
    kv: (key, fallback) => store.getKV(key, fallback),

    staffWithTitle(title) {
      return store.listParties({ role: "staff" }).find((s) => s.attributes.title === title) ?? null;
    },

    /** Inbound addresses (phone numbers / mailboxes) → which playbook they belong to. */
    line(address) {
      return address ? store.getKV("lines", {})[address] ?? null : null;
    },
    lines() {
      return store.getKV("lines", {});
    },
    /** The phone number / mailbox a playbook sends from, e.g. ("maintenance", "sms"). */
    lineAddress(playbook, channel) {
      return Object.entries(store.getKV("lines", {})).find(([, l]) => l.playbook === playbook && l.channel === channel)?.[0] ?? null;
    },
  };
}

/** Mon–Fri, 8 AM – 6 PM local. */
export function isBusinessHours(date, timeZone) {
  const { weekday, hour } = localParts(date, timeZone);
  return weekday >= 1 && weekday <= 5 && hour >= 8 && hour < 18;
}
