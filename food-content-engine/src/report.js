// Library health report: what you have, what is unused, what to film next.
import { unusedFootage } from "./search.js";
import { titleCase } from "./taxonomy.js";

const COVERAGE_STAGES = ["ingredients", "prep", "cooking", "plating", "hero", "eating"];

export function libraryReport(ix, brand) {
  const stats = ix.stats();
  const shots = ix.allShots({ includeDead: true });
  const byRecipe = new Map();
  for (const s of shots) {
    const key = s.clip_recipe ?? "(no recipe)";
    if (!byRecipe.has(key)) byRecipe.set(key, { recipe: key, shots: 0, seconds: 0, dead: 0, stages: {}, hero: 0, hook: 0, clips: new Set() });
    const r = byRecipe.get(key);
    r.shots++;
    r.seconds += s.duration;
    if (s.dead) r.dead++;
    if (s.hero_worthy) r.hero++;
    if (s.hook_worthy) r.hook++;
    r.stages[s.stage ?? "untagged"] = (r.stages[s.stage ?? "untagged"] ?? 0) + 1;
    r.clips.add(s.clip_id);
  }
  const recipes = [...byRecipe.values()].map((r) => ({ ...r, clips: r.clips.size, seconds: Math.round(r.seconds), missing: COVERAGE_STAGES.filter((st) => !r.stages[st]) }));
  const tally = (key) => {
    const m = new Map();
    for (const s of shots) for (const v of s[key] ?? []) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  };
  const unused = unusedFootage(ix);
  const usedShots = stats.used?.n ?? 0;
  const data = { stats, recipes, topActions: tally("actions"), topIngredients: tally("ingredients"), unused, usedShots };

  const L = [];
  L.push(`# Library report — ${brand?.brand?.name ?? "Food Content Engine"}`, "");
  L.push(`Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, "");
  L.push("## Totals", "");
  L.push(`| Clips | Footage | Shots | Dead shots | Hero shots | Hook shots | Shots used in plans | Plans |`);
  L.push(`|---|---|---|---|---|---|---|---|`);
  L.push(`| ${stats.clips.n} | ${fmtMin(stats.clips.seconds)} | ${stats.shots.n} | ${stats.shots.dead ?? 0} | ${stats.shots.hero ?? 0} | ${stats.shots.hook ?? 0} | ${usedShots} (${stats.shots.n ? Math.round((usedShots / stats.shots.n) * 100) : 0}%) | ${stats.plans.n} |`, "");
  L.push("## Coverage by recipe", "", "A recipe is ready for every template when it has all six stages. `missing` is the filming list.", "");
  L.push("| Recipe | Clips | Footage | Shots | Dead | Hero | " + COVERAGE_STAGES.map(titleCase).join(" | ") + " | Missing |");
  L.push("|---|---|---|---|---|---|" + COVERAGE_STAGES.map(() => "---").join("|") + "|---|");
  for (const r of recipes.sort((a, b) => b.seconds - a.seconds)) {
    L.push(`| ${r.recipe} | ${r.clips} | ${fmtMin(r.seconds)} | ${r.shots} | ${r.dead} | ${r.hero} | ${COVERAGE_STAGES.map((st) => r.stages[st] ?? 0).join(" | ")} | ${r.missing.length ? r.missing.join(", ") : "—"} |`);
  }
  L.push("", "## Unused footage (repurposing backlog)", "");
  if (!unused.length) L.push("Everything usable has been placed in at least one plan.");
  else {
    L.push("| Recipe | Unused shots | Unused footage | Hero | Hook | Clips |", "|---|---|---|---|---|---|");
    for (const u of unused) L.push(`| ${u.recipe} | ${u.shots} | ${fmtMin(u.seconds)} | ${u.hero} | ${u.hook} | ${u.clips} |`);
  }
  L.push("", "## Most common actions", "", data.topActions.map(([k, n]) => `- ${k.replace(/_/g, " ")}: ${n}`).join("\n") || "- none tagged yet");
  L.push("", "## Most common ingredients", "", data.topIngredients.map(([k, n]) => `- ${k.replace(/_/g, " ")}: ${n}`).join("\n") || "- none tagged yet");
  L.push("", "## Shot types", "", (stats.byShotType ?? []).map((r) => `- ${r.shot_type ?? "untagged"}: ${r.n}`).join("\n"));
  L.push("", "## What to film next", "");
  const filmList = recipes.filter((r) => r.missing.length).map((r) => `- **${r.recipe}**: ${r.missing.join(", ")}`);
  L.push(filmList.length ? filmList.join("\n") : "- Nothing: every recipe has full stage coverage.");
  const deadTotal = stats.shots.dead ?? 0;
  if (deadTotal) L.push("", `${deadTotal} shots are flagged dead (no on-screen motion). They are excluded from planning automatically; delete them from the library to save space.`);
  return { markdown: L.join("\n") + "\n", data };
}

function fmtMin(seconds) {
  const s = Math.round(seconds ?? 0);
  if (s < 90) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}
