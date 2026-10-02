/**
 * Explicit state machines. A case can only move along declared transitions, so an
 * agent bug (or a model's suggestion) can't push a work order from "new" straight to
 * "closed". `human_review` is reachable from anywhere and can go anywhere: a person
 * can always take over and hand back.
 */
export function defineMachine({ initial, transitions, terminal = [], labels = {}, mainPath = [] }) {
  const allowed = new Map(Object.entries(transitions).map(([from, to]) => [from, new Set(to)]));
  const states = new Set([...allowed.keys(), ...Object.values(transitions).flat(), ...terminal, "human_review"]);

  function canTransition(from, to) {
    if (from === to) return true;
    if (to === "human_review" || from === "human_review") return states.has(to) && states.has(from);
    return allowed.get(from)?.has(to) ?? false;
  }

  return {
    initial,
    terminal: new Set(terminal),
    states: [...states],
    labels,
    mainPath,
    canTransition,
    assertTransition(from, to) {
      if (!states.has(to)) throw new Error(`Unknown state "${to}"`);
      if (!canTransition(from, to)) throw new Error(`Illegal transition ${from} → ${to}`);
    },
  };
}
