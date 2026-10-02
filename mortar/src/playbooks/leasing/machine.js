import { defineMachine } from "../../core/machine.js";

/**  new ─► engaged ─► tour_scheduled ─► toured ─► applied ─► leased
 *            │  ▲            │              │
 *            ▼  │            ▼              ▼
 *          nurture ◄────── (cancel)       lost   (lost/leased close the case) */
export const machine = defineMachine({
  initial: "new",
  transitions: {
    new: ["engaged", "tour_scheduled", "lost"],
    engaged: ["tour_scheduled", "applied", "nurture", "lost"],
    tour_scheduled: ["toured", "engaged", "applied", "lost"],
    toured: ["applied", "nurture", "lost", "tour_scheduled", "engaged"],
    applied: ["leased", "lost"],
    nurture: ["engaged", "tour_scheduled", "applied", "lost"],
    lost: ["engaged"],
  },
  terminal: ["leased"],
  mainPath: ["new", "engaged", "tour_scheduled", "toured", "applied", "leased"],
  labels: { new: "New", engaged: "Engaged", tour_scheduled: "Tour scheduled", toured: "Toured", applied: "Applied", leased: "Leased", nurture: "Nurture", lost: "Lost", human_review: "Human review" },
});

/** Follow Up Boss stage names (configurable per account). */
export const FUB_STAGE = { engaged: "Lead", tour_scheduled: "Hot Prospect", toured: "Hot Prospect", applied: "Pending", leased: "Closed", nurture: "Nurture", lost: "Trash" };
