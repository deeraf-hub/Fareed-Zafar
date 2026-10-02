import { z } from "zod";

/**
 * A model task is one narrow job with a typed contract:
 *
 *   name          "maintenance.extract"
 *   schema        zod schema the output must satisfy (validated on every call)
 *   tiers         preference order, e.g. ["local", "frontier"] or ["frontier"]
 *   system        stable instructions (cached by the frontier provider)
 *   prompt(input) builds the compact context pack for this one call
 *   simulate(input) offline stand-in used only by the simulated provider
 *   minConfidence below this, the router tries the next tier
 *
 * Tasks are declared next to the playbook that uses them, so reading a playbook
 * shows exactly where — and why — a model is involved.
 */
export function defineTask(spec) {
  for (const key of ["name", "schema", "tiers", "system", "prompt", "simulate"]) {
    if (!spec[key]) throw new Error(`Task ${spec.name ?? "(unnamed)"} is missing "${key}"`);
  }
  const { $schema, ...jsonSchema } = z.toJSONSchema(spec.schema);
  return Object.freeze({
    maxOutputTokens: 400,
    frontierMaxTokens: 4000, // frontier models think adaptively; leave room
    effort: "low",
    minConfidence: null,
    cacheable: true,
    why: "",
    ...spec,
    jsonSchema,
  });
}

export function createTaskRegistry(tasks) {
  const byName = new Map();
  for (const task of tasks) {
    if (byName.has(task.name)) throw new Error(`Duplicate model task: ${task.name}`);
    byName.set(task.name, task);
  }
  return {
    get(name) {
      const task = byName.get(name);
      if (!task) throw new Error(`Unknown model task: ${name}`);
      return task;
    },
    list: () => [...byName.values()],
  };
}
