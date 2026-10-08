// ============================================================================
// 2 · ASSEMBLE CONTEXT
// ----------------------------------------------------------------------------
// Gathers everything the AI step needs into ONE item:
//   message   → the normalized customer message
//   config    → the per-client settings from "Client Config"
//   kb_text   → the approved knowledge base, formatted for the prompt
//   history   → the last N turns of this conversation (Claude message format)
//   lead      → the customer's existing row in the Leads sheet (or null)
//   triage    → "bot" | "human" | "ignore"
//       bot    = the assistant answers
//       human  = a person took over this chat (status = human in Leads) → stay silent, alert owner
//       ignore = Meta re-delivered a message we already processed (same message_id)
// ============================================================================

const message = $('Normalize Message').first().json;
const config = $('Client Config').first().json;
const zone = config.timezone || 'UTC';

// Google Sheets nodes return one empty item when nothing matches → drop those.
const rows = (items) => items.map((i) => i.json).filter((r) => r && Object.keys(r).length > 0);

const kbRows = rows($('Load Knowledge Base').all());
const leadRows = rows($('Lookup Lead').all()).filter((r) => String(r.contact_key) === message.contact_key);
const logRows = rows($('Load Conversation History').all()).filter((r) => String(r.contact_key) === message.contact_key);

// --- Knowledge base → readable text, grouped by category ---------------------
const ORDER = ['services', 'hours', 'location', 'booking', 'policies', 'faq'];
const groups = {};
for (const r of kbRows) {
  const cat = String(r.category || 'faq').trim().toLowerCase();
  if (!r.title && !r.content) continue;
  (groups[cat] = groups[cat] || []).push(`- ${String(r.title || '').trim()}: ${String(r.content || '').trim()}`);
}
const cats = [...ORDER.filter((c) => groups[c]), ...Object.keys(groups).filter((c) => !ORDER.includes(c))];
const kb_text = cats.map((c) => `## ${c.toUpperCase()}\n${groups[c].join('\n')}`).join('\n\n') || '(The knowledge base is empty.)';

// --- Timestamps: accept ISO strings, "yyyy-LL-dd HH:mm" or Sheets date serials
function parseWhen(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return DateTime.fromMillis(Math.round((value - 25569) * 86400000), { zone });
  const s = String(value);
  let dt = DateTime.fromISO(s, { zone });
  if (!dt.isValid) dt = DateTime.fromFormat(s, 'yyyy-LL-dd HH:mm:ss', { zone });
  if (!dt.isValid) dt = DateTime.fromFormat(s, 'yyyy-LL-dd HH:mm', { zone });
  return dt.isValid ? dt : null;
}

// --- Conversation history → Claude messages (oldest first, last N turns) -----
logRows.sort((a, b) => {
  const ta = parseWhen(a.timestamp), tb = parseWhen(b.timestamp);
  return (ta ? ta.toMillis() : 0) - (tb ? tb.toMillis() : 0);
});
const maxTurns = Number(config.max_history_turns) || 10;
const history = [];
for (const r of logRows.slice(-maxTurns)) {
  if (r.customer_message) history.push({ role: 'user', content: String(r.customer_message) });
  if (r.bot_reply) history.push({ role: 'assistant', content: String(r.bot_reply) });
}

// --- Triage -------------------------------------------------------------------
const lead = leadRows[0] || null;
const is_duplicate = logRows.some((r) => r.message_id && String(r.message_id) === message.message_id);

let human_mode = false;
if (lead && String(lead.status || '').trim().toLowerCase() === 'human') {
  const since = parseWhen(lead.handoff_at);
  const hours = since ? (Date.now() - since.toMillis()) / 3600000 : 0;
  human_mode = hours < (Number(config.human_mode_timeout_hours) || 12);   // auto-resume the bot after the timeout
}

const triage = is_duplicate ? 'ignore' : human_mode ? 'human' : 'bot';

return [{ json: { message, config, lead, kb_text, kb_row_count: kbRows.length, history, triage, is_duplicate, human_mode } }];
