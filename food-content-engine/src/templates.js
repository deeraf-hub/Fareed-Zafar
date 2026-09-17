import fs from "node:fs";
import path from "node:path";

export function loadTemplates(config) {
  const map = new Map();
  if (!fs.existsSync(config.templatesDir)) return map;
  for (const f of fs.readdirSync(config.templatesDir).filter((x) => x.endsWith(".json")).sort()) {
    const t = JSON.parse(fs.readFileSync(path.join(config.templatesDir, f), "utf8"));
    validateTemplate(t, f);
    map.set(t.id, t);
  }
  return map;
}

export function getTemplate(config, id) {
  const t = loadTemplates(config).get(id);
  if (!t) throw new Error(`Unknown template "${id}". Available: ${[...loadTemplates(config).keys()].join(", ")}`);
  return t;
}

export function validateTemplate(t, name = t?.id) {
  const problems = [];
  if (!t?.id) problems.push("missing id");
  if (!t?.platform) problems.push("missing platform");
  if (!Array.isArray(t?.slots) || !t.slots.length) problems.push("slots must be a non-empty array");
  for (const s of t?.slots ?? []) {
    if (!s.id) problems.push("slot without id");
    if (!(s.seconds > 0)) problems.push(`slot ${s.id}: seconds must be > 0`);
    if (!(s.count >= 1)) problems.push(`slot ${s.id}: count must be >= 1`);
  }
  if (problems.length) throw new Error(`Template ${name} is invalid: ${problems.join("; ")}`);
  return true;
}
