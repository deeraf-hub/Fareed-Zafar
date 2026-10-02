import { defineMachine } from "../../core/machine.js";

/**  discovered ─► qualified ─► ready ─► outreach ─► replied ─► meeting_booked ─► won
 *        │            │                    │           │               │
 *        ▼            ▼                    ▼           ▼               ▼
 *   disqualified    nurture ◄─────────── nurture     lost           lost
 *   (also: no_contact, suppressed) — won/lost/disqualified/no_contact/suppressed close the case */
export const machine = defineMachine({
  initial: "discovered",
  transitions: {
    discovered: ["qualified", "nurture", "disqualified"],
    qualified: ["ready", "no_contact", "nurture", "suppressed"],
    ready: ["outreach", "suppressed", "replied", "lost"],
    outreach: ["replied", "nurture", "lost", "suppressed", "no_contact", "meeting_booked"],
    replied: ["meeting_booked", "nurture", "lost", "suppressed", "outreach"],
    meeting_booked: ["won", "lost", "replied"],
    nurture: ["outreach", "replied", "qualified", "lost", "suppressed"],
  },
  terminal: ["won", "lost", "disqualified", "no_contact", "suppressed"],
  mainPath: ["discovered", "qualified", "ready", "outreach", "replied", "meeting_booked", "won"],
  labels: {
    discovered: "Discovered",
    qualified: "Qualified",
    ready: "Ready to send",
    outreach: "In sequence",
    replied: "Replied",
    meeting_booked: "Meeting booked",
    won: "Signed",
    lost: "Lost",
    nurture: "Nurture",
    disqualified: "Disqualified",
    no_contact: "No contact",
    suppressed: "Suppressed",
    human_review: "Human review",
  },
});

export const CLOSING = new Set(["won", "lost", "disqualified", "no_contact", "suppressed"]);

/** Follow Up Boss stage names for owner prospects (configurable per account). */
export const FUB_STAGE = { outreach: "Prospect", replied: "Hot Prospect", meeting_booked: "Appointment Set", won: "Closed", lost: "Trash", nurture: "Nurture", suppressed: "Trash" };
