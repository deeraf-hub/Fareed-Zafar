import { defineMachine } from "../../core/machine.js";

/**
 *   new ─► triaged ─► dispatching ─► vendor_assigned ─► on_site ─► mitigated ─► repair_scheduled ─► resolved ─► closed
 *            │             ▲                                  │          │                              ▲
 *            ├─► scheduled ─┼──────────────────────────────────┴──────────┴──────────────────────────────┘
 *            └─► awaiting_info
 *   human_review is reachable from (and can return to) any state.
 */
export const machine = defineMachine({
  initial: "new",
  transitions: {
    new: ["triaged", "dispatching", "scheduled", "awaiting_info", "resolved"],
    triaged: ["dispatching", "scheduled", "awaiting_info", "resolved"],
    awaiting_info: ["triaged", "dispatching", "scheduled", "resolved"],
    scheduled: ["dispatching", "vendor_assigned", "resolved"],
    dispatching: ["vendor_assigned", "dispatching", "on_site", "mitigated", "resolved"],
    vendor_assigned: ["on_site", "dispatching", "mitigated", "resolved"],
    on_site: ["mitigated", "repair_scheduled", "resolved"],
    mitigated: ["repair_scheduled", "resolved", "dispatching"],
    repair_scheduled: ["resolved", "dispatching"],
    resolved: ["closed", "dispatching", "repair_scheduled"],
  },
  terminal: ["closed"],
  mainPath: ["new", "dispatching", "vendor_assigned", "on_site", "mitigated", "repair_scheduled", "resolved", "closed"],
  labels: {
    new: "New",
    triaged: "Triaged",
    awaiting_info: "Awaiting info",
    scheduled: "Scheduled",
    dispatching: "Dispatching",
    vendor_assigned: "Vendor assigned",
    on_site: "On site",
    mitigated: "Mitigated",
    repair_scheduled: "Repair scheduled",
    resolved: "Resolved",
    closed: "Closed",
    human_review: "Human review",
  },
});

export const ACTIVE_DISPATCH = new Set(["dispatching", "vendor_assigned", "on_site", "mitigated"]);
