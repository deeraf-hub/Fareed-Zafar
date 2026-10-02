import { estimateTokens } from "./tokens.js";

/**
 * Context engineering: build the smallest prompt that lets the model do one job.
 *
 * Sections are added in priority order until the token budget is spent; long
 * sections are truncated, low-priority ones dropped. Objects render as compact
 * "key: value" lines (cheaper than JSON). The model never sees a raw transcript —
 * it sees the new message plus the facts and the rolling summary the store keeps.
 */
export function contextPack(sections, { budgetTokens = 900 } = {}) {
  const ordered = sections
    .filter((s) => s && s.body !== undefined && s.body !== null && s.body !== "")
    .map((s, index) => ({ priority: 5, ...s, index }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index);

  const included = [];
  const dropped = [];
  let used = 0;

  for (const section of ordered) {
    let body = render(section.body);
    let tokens = estimateTokens(`## ${section.title}\n${body}\n`);
    const cap = section.maxTokens ?? Infinity;
    const remaining = budgetTokens - used;

    if (tokens > cap || tokens > remaining) {
      const allowed = Math.min(cap, remaining);
      if (section.priority > 1 && allowed < 40) {
        dropped.push(section.title);
        continue;
      }
      body = truncate(body, Math.max(allowed, 40) * 4 - section.title.length - 8);
      tokens = estimateTokens(`## ${section.title}\n${body}\n`);
    }
    included.push({ ...section, body, tokens });
    used += tokens;
  }

  // Keep the original reading order for the model.
  included.sort((a, b) => a.index - b.index);
  return {
    text: included.map((s) => `## ${s.title}\n${s.body}`).join("\n\n"),
    tokens: used,
    dropped,
  };
}

function render(body) {
  if (typeof body === "string") return body.trim();
  if (Array.isArray(body)) return body.map((item) => `- ${typeof item === "string" ? item : renderLine(item)}`).join("\n");
  return Object.entries(body)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? renderLine(v) : v}`)
    .join("\n");
}

function renderLine(value) {
  if (Array.isArray(value)) return value.map((v) => (typeof v === "object" ? renderLine(v) : v)).join("; ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(", ");
  }
  return String(value);
}

function truncate(text, maxChars) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}
