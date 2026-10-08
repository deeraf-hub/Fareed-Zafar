// ============================================================================
// Local stand-ins for the provider nodes. Everything here is SIMULATED:
//   • Google Sheets  → in-memory tabs per preview session
//   • Google Calendar→ in-memory events per preview session
//   • Gmail          → an "emails" outbox per session (nothing is sent)
//   • WhatsApp / Instagram send → an "outbox" per session (nothing is sent)
//   • Anthropic API  → a small rule-based responder that returns the same JSON
//                      shape the real model is asked for (no API call, no Claude)
//   • Crypto (HMAC)  → accepts the demo's marker signature
// ============================================================================
const { DateTime } = require('luxon');

let counter = 0;
const nextId = (prefix) => `${prefix}-${String(++counter).padStart(4, '0')}`;

// ---------------------------------------------------------------- Google Sheets
function googleSheets(params, items, ctx, tr) {
  const tab = params.sheetName;
  const sheet = ctx.session.sheets[tab];
  if (!sheet) throw new Error(`Simulated Google Sheets: tab "${tab}" does not exist`);
  if (params.operation === 'read') {
    let rows = sheet;
    const filters = (params.filtersUI && params.filtersUI.values) || [];
    for (const f of filters) rows = rows.filter((r) => String(r[f.lookupColumn] ?? '') === String(f.lookupValue ?? ''));
    tr.summary = `read "${tab}"${filters.length ? ` where ${filters.map((f) => `${f.lookupColumn} = ${f.lookupValue}`).join(', ')}` : ''} → ${rows.length} row(s)`;
    return rows.map((r) => ({ json: { ...r } }));
  }
  if (params.operation === 'append') {
    for (const item of items) sheet.push({ ...item.json });
    tr.summary = `appended ${items.length} row(s) to "${tab}"`;
    tr.data = items[0] && items[0].json;
    return items.map((i) => ({ json: { ...i.json } }));
  }
  if (params.operation === 'appendOrUpdate') {
    const key = (params.columns && params.columns.matchingColumns && params.columns.matchingColumns[0]) || 'contact_key';
    let updated = 0, appended = 0;
    for (const item of items) {
      const idx = sheet.findIndex((r) => String(r[key]) === String(item.json[key]));
      if (idx >= 0) { sheet[idx] = { ...sheet[idx], ...item.json }; updated++; } else { sheet.push({ ...item.json }); appended++; }
    }
    tr.summary = `"${tab}": ${updated ? `updated ${updated} row(s)` : ''}${updated && appended ? ', ' : ''}${appended ? `added ${appended} row(s)` : ''} (matched on ${key})`;
    tr.data = items[0] && items[0].json;
    return items.map((i) => ({ json: { ...i.json } }));
  }
  throw new Error(`Simulated Google Sheets: unsupported operation ${params.operation}`);
}

// ---------------------------------------------------------------- Google Calendar
const overlaps = (e, startIso, endIso) => e.status !== 'cancelled' && new Date(e.start.dateTime) < new Date(endIso) && new Date(e.end.dateTime) > new Date(startIso);

function googleCalendar(params, items, ctx, tr) {
  const cal = ctx.session.calendar;
  if (params.resource === 'calendar' && params.operation === 'availability') {
    const busy = cal.filter((e) => overlaps(e, params.timeMin, params.timeMax));
    tr.summary = `free/busy ${params.timeMin} → ${params.timeMax}: ${busy.length ? 'BUSY' : 'free'}`;
    return [{ json: { available: busy.length === 0 } }];
  }
  if (params.operation === 'create') {
    const id = nextId('evt');
    const event = {
      id, status: 'confirmed', created: new Date().toISOString(),
      summary: params.additionalFields && params.additionalFields.summary,
      description: params.additionalFields && params.additionalFields.description,
      start: { dateTime: params.start }, end: { dateTime: params.end },
      htmlLink: `https://calendar.google.com/calendar/event?eid=${id}`,   // simulated link, not a real event
    };
    cal.push(event);
    tr.summary = `event created: "${event.summary}" ${params.start} → ${params.end}`;
    tr.data = event;
    return [{ json: event }];
  }
  if (params.operation === 'getAll') {
    const found = cal.filter((e) => overlaps(e, params.timeMin, params.timeMax));
    tr.summary = `${found.length} event(s) in the slot`;
    return found.map((e) => ({ json: { ...e } }));
  }
  if (params.operation === 'delete') {
    const idx = cal.findIndex((e) => e.id === params.eventId);
    if (idx >= 0) cal.splice(idx, 1);
    tr.summary = `event ${params.eventId} deleted`;
    return [{ json: { success: true } }];
  }
  throw new Error(`Simulated Google Calendar: unsupported ${params.resource}/${params.operation}`);
}

// ---------------------------------------------------------------- Gmail
function gmail(params, ctx, tr) {
  const email = { id: nextId('email'), at: new Date().toISOString(), to: params.sendTo, subject: params.subject, text: params.message, simulated: true };
  ctx.session.emails.push(email);
  tr.summary = `email queued (simulated): "${params.subject}"`;
  tr.data = email;
  return { json: { id: email.id, labelIds: ['SENT'], simulated: true } };
}

// ---------------------------------------------------------------- WhatsApp send
function whatsApp(params, ctx, tr) {
  const msg = { id: nextId('wamid.SIM'), at: new Date().toISOString(), channel: 'whatsapp', to: params.recipientPhoneNumber, text: params.textBody, simulated: true };
  ctx.session.outbox.push(msg);
  tr.summary = `WhatsApp reply queued (simulated) → ${msg.to}`;
  tr.data = msg;
  return { json: { messaging_product: 'whatsapp', contacts: [{ wa_id: msg.to }], messages: [{ id: msg.id }], simulated: true } };
}

// ---------------------------------------------------------------- HTTP Request (Anthropic / Instagram send)
function httpRequest(params, item, ctx, tr) {
  const url = String(params.url || '');
  if (url.includes('api.anthropic.com')) {
    const body = typeof params.jsonBody === 'string' ? JSON.parse(params.jsonBody) : params.jsonBody;
    const res = simulateClaude(body, ctx);
    tr.summary = `SIMULATED model reply (no API call) · intent ${res._sim.intent}${res._sim.hook ? ` · test hook: ${res._sim.hook}` : ''}`;
    tr.data = { request_preview: { model: body.model, system_chars: body.system.map((s) => s.text.length), messages: body.messages.length, output_config: body.output_config && { effort: body.output_config.effort, format: 'json_schema' } }, response_json: res._sim.ai };
    const { _sim, ...response } = res;
    return { json: response };
  }
  if (/\/messages$/.test(url)) {
    const body = typeof params.jsonBody === 'string' ? JSON.parse(params.jsonBody) : params.jsonBody;
    const msg = { id: nextId('m_SIM'), at: new Date().toISOString(), channel: 'instagram', to: body.recipient.id, text: body.message.text, simulated: true };
    ctx.session.outbox.push(msg);
    tr.summary = `Instagram reply queued (simulated) → ${msg.to}`;
    tr.data = msg;
    return { json: { recipient_id: msg.to, message_id: msg.id, simulated: true } };
  }
  throw new Error(`Simulated HTTP Request: no simulator for ${url}`);
}

// ---------------------------------------------------------------- Crypto (HMAC)
function crypto(params, item, ctx, tr) {
  // The real node recomputes Meta's HMAC over the raw body. The demo cannot
  // reproduce Meta's secret, so it accepts the marker "sha256=SIMULATED".
  const header = (item.json.headers && item.json.headers['x-hub-signature-256']) || '';
  const expected = header === 'sha256=SIMULATED' ? 'SIMULATED' : 'mismatch';
  tr.summary = expected === 'SIMULATED' ? 'signature accepted (demo marker)' : 'signature mismatch';
  return { json: { ...item.json, [params.dataPropertyName || 'expected_signature']: expected } };
}

// ============================================================================
// SIMULATED MODEL
// Reads the real prompt the workflow built (knowledge base with ids, booking
// hours, today's date, customer profile) and answers with the same JSON shape
// the real model is constrained to. Rule-based and deterministic; it exists so
// the rest of the workflow can be exercised without an API key.
// ============================================================================
const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'you', 'your', 'how', 'much', 'what', 'and', 'for', 'of', 'to', 'i', 'it', 'in', 'on', 'at', 'me', 'my', 'we', 'can', 'please', 'hi', 'hello', 'much', 'cost', 'price', 'does', 'have', 'with', 'this', 'that', 'there', 'about', 'be', 'any', 'or']);
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));

function parsePrompt(body) {
  const sys = body.system.map((s) => s.text).join('\n');
  const kb = [];
  for (const m of sys.matchAll(/^- \[([A-Z]\d+)\] (.*?): (.*)$/gm)) {
    const cat = (sys.slice(0, m.index).match(/## ([A-Z]+)\n(?![\s\S]*## )/) || [])[1];
    kb.push({ id: m[1], category: (cat || '').toLowerCase(), title: m[2], content: m[3] });
  }
  const hours = sys.match(/BOOKING HOURS: (\d{2}:\d{2})–(\d{2}:\d{2}) \(([^)]+)\), closed on: ([^.]*)\./) || [];
  const today = sys.match(/TODAY: ([^·]+)· current time (\d{2}:\d{2}) \(([^)]+)\)/) || [];
  const profile = sys.match(/CUSTOMER PROFILE: name: ([^;]+);/);
  const consent = /lead\.consent/.test(sys) && /May we save your name/.test(sys);
  return {
    kb,
    opening: hours[1] || '10:00', closing: hours[2] || '19:00', zone: hours[3] || 'UTC', closedDays: (hours[4] || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    today: today[1] ? DateTime.fromFormat(today[1].trim(), 'cccc, d LLLL yyyy', { zone: hours[3] || 'UTC' }) : DateTime.now().setZone(hours[3] || 'UTC'),
    profileName: profile && profile[1] !== 'unknown' && !/new customer/.test(profile[1]) ? profile[1].trim() : null,
    consentRequired: consent,
  };
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function parseDate(text, today) {
  const t = text.toLowerCase();
  let m;
  if ((m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) return DateTime.fromISO(m[0], { zone: today.zone });
  if (/\bday after tomorrow\b/.test(t)) return today.plus({ days: 2 });
  if (/\btomorrow\b|\bkal\b/.test(t)) return today.plus({ days: 1 });
  if (/\btoday\b|\baaj\b/.test(t)) return today;
  if ((m = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/)) || (m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/))) {
    const day = Number(isNaN(Number(m[1])) ? m[2] : m[1]);
    const mon = (isNaN(Number(m[1])) ? m[1] : m[2]).slice(0, 3);
    const month = MONTHS.findIndex((x) => x.startsWith(mon)) + 1;
    let d = DateTime.fromObject({ year: today.year, month, day }, { zone: today.zone });
    if (d < today.startOf('day')) d = d.plus({ years: 1 });
    return d;
  }
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b|\\b${WEEKDAYS[i].slice(0, 3)}\\b`).test(t)) {
      let d = today.plus({ days: 1 });
      while (d.weekday !== i + 1) d = d.plus({ days: 1 });
      if (/\bnext\b/.test(t) && d.diff(today, 'days').days < 7 && d.weekday <= today.weekday) d = d.plus({ weeks: 1 });
      return d;
    }
  }
  return null;
}

function parseTime(text) {
  const t = text.toLowerCase();
  let m;
  if ((m = t.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/))) {
    let h = Number(m[1]); const min = Number(m[2]);
    if (m[3] === 'pm' && h < 12) h += 12; if (m[3] === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  if ((m = t.match(/\b(\d{1,2})\s*(am|pm)\b/))) {
    let h = Number(m[1]); if (m[2] === 'pm' && h < 12) h += 12; if (m[2] === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:00`;
  }
  if ((m = t.match(/\b(?:at|around|baje)\s+(\d{1,2})\b/)) || (m = t.match(/\b(\d{1,2})\s+baje\b/))) {
    let h = Number(m[1]); if (h >= 1 && h <= 7) h += 12;   // "at 3" → 15:00 (business hours)
    return `${String(h).padStart(2, '0')}:00`;
  }
  return null;
}

function matchService(text, kb) {
  const w = new Set(words(text));
  let best = null, bestScore = 0;
  for (const row of kb.filter((r) => r.category === 'services')) {
    const score = words(row.title).filter((x) => w.has(x) || [...w].some((y) => y.length > 4 && (x.startsWith(y) || y.startsWith(x)))).length;
    if (score > bestScore) { best = row; bestScore = score; }
  }
  return best;
}

// Synonyms map everyday wording onto the words used in the sheet.
const SYNONYMS = { located: 'address', location: 'address', where: 'address', directions: 'maps', map: 'maps', timings: 'hours', timing: 'hours', hours: 'hours', open: 'hours', opening: 'hours', close: 'hours', closed: 'hours', closing: 'hours', time: 'hours', cost: 'price', costs: 'price', charges: 'price', charge: 'price', fee: 'price', fees: 'price', rates: 'price', rate: 'price', pricing: 'price', prices: 'price', kids: 'children', kid: 'children', child: 'children', pay: 'payment', paying: 'payment', card: 'cards', dentist: 'dentists', doctor: 'dentists', doctors: 'dentists', cancel: 'cancellation', reschedule: 'cancellation', walkin: 'walk-ins', walkins: 'walk-ins', parking: 'parking', emergency: 'emergency', languages: 'languages', language: 'languages', speak: 'languages', whitening: 'whitening', cleaning: 'cleaning', scaling: 'cleaning', polishing: 'cleaning', filling: 'filling', fillings: 'filling', braces: 'braces', extraction: 'extraction', extract: 'extraction', checkup: 'check-up', consultation: 'consultation' };
const CATEGORY_WORDS = { hours: 'hours', address: 'location', maps: 'location', price: 'services', payment: 'policies', cards: 'policies' };
const matches = (x, h) => h === x || (x.length > 4 && h.length > 4 && (h.startsWith(x) || x.startsWith(h)));

function matchFaq(text, kb) {
  const w = [...new Set(words(text).map((x) => SYNONYMS[x] || x))];
  const rowWords = kb.map((row) => words(row.title + ' ' + row.content));
  const df = (x) => rowWords.filter((hay) => hay.some((h) => matches(x, h))).length;     // how many rows mention this word
  const unknown = w.filter((x) => x.length > 3 && !CATEGORY_WORDS[x] && df(x) === 0);  // content words the sheet never mentions
  const scored = kb.map((row, i) => {
    const specific = w.reduce((a, x) => a + (rowWords[i].some((h) => matches(x, h)) ? 1 / df(x) : 0), 0);
    const category = w.some((x) => CATEGORY_WORDS[x] === row.category) ? 0.6 : 0;
    return { row, score: specific + category, specific };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < 0.6) return [];
  if (unknown.length && top.specific < 1) return [];     // the question is about something the sheet does not cover
  const picked = [top.row];
  if (scored[1] && scored[1].specific >= 0.5 && scored[1].score >= top.score * 0.7) picked.push(scored[1].row);
  return picked;
}

function faqSentence(row) {
  const parts = row.content.split('·').map((s) => s.trim());
  if (row.category === 'services') return `${row.title} is ${parts[0]}${parts[1] ? ` and takes ${parts[1]}` : ''}${parts.slice(2).length ? ` (${parts.slice(2).join(', ')})` : ''}.`;
  if (row.category === 'hours') return /closed/i.test(row.content) ? `We are closed on ${row.title}.` : `We are open ${row.title}, ${row.content}.`;
  if (row.category === 'location') return `${row.title}: ${row.content}`;
  return row.content;
}

function simulateClaude(body, ctx) {
  const p = parsePrompt(body);
  const text = String(body.messages[body.messages.length - 1].content || '');
  const low = text.toLowerCase();
  const hooks = ctx.hooks || {};
  const mem = ctx.session.sim.drafts;
  const key = ctx.contactKey || 'unknown';
  if (hooks.reset_draft) delete mem[key];   // walkthrough scenes start from a clean simulated-model memory
  const draft = mem[key] || (mem[key] = { name: p.profileName, service: null, date: null, time: null, awaiting: null, consent: 'unknown' });
  if (!draft.name && p.profileName) draft.name = p.profileName;

  const ai = { intent: 'faq', reply: '', confidence: 0.9, needs_human: false, handoff_reason: null, kb_refs: [],
    lead: { name: null, phone: null, email: null, service_interest: null, consent: draft.consent }, booking: { requested: false, service: null, date: null, time: null, ready_to_book: false } };
  let hook = null;

  // Lead details volunteered in the message
  const nameMatch = low.match(/\b(?:my name is|i am|i'm|this is|mera naam)\s+([a-z][a-z .'-]{1,40})/i);
  if (nameMatch) draft.name = nameMatch[1].trim().replace(/\s+(and|,).*$/i, '').split(/\s+/).slice(0, 3).map((s) => s[0].toUpperCase() + s.slice(1)).join(' ');
  const phone = text.match(/\+?\d[\d\s-]{8,}\d/); if (phone) ai.lead.phone = phone[0].replace(/[\s-]/g, '');
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/); if (email) ai.lead.email = email[0];
  if (p.consentRequired && draft.awaiting === 'consent') { draft.consent = /\b(yes|haan|ok|sure|ji)\b/.test(low) ? 'yes' : /\bno\b/.test(low) ? 'no' : 'unknown'; ai.lead.consent = draft.consent; draft.awaiting = null; }

  const wantsHuman = /\b(human|real person|agent|manager|complain|complaint|speak to someone|talk to someone)\b/.test(low);
  const bookingWords = /\b(book|booking|appointment|schedule|reserve|slot|visit)\b/.test(low);
  const sensitive = /\b(discount|cheaper|offer|deal|medicine|tablet|painkiller|diagnos|prescri|implant|insurance claim|refund)\b/.test(low);

  if (hooks.invented_price) {
    // TEST HOOK: make the simulated model misquote a price so the workflow's real price guard can be shown rejecting it.
    const row = p.kb.find((r) => r.category === 'services') || { id: 'S1', title: 'Teeth Cleaning' };
    hook = 'invented_price';
    Object.assign(ai, { intent: 'faq', reply: `${row.title} is PKR 2,750 and takes 30 minutes.`, confidence: 0.9, kb_refs: [row.id] });
  } else if (wantsHuman) {
    Object.assign(ai, { intent: 'handoff', reply: 'Of course, I will pass this to our team.', confidence: 1, needs_human: true, handoff_reason: 'customer asked for a person' });
  } else if (bookingWords || draft.awaiting) {
    ai.intent = 'booking'; ai.booking.requested = true;
    const svc = matchService(text, p.kb); if (svc) draft.service = svc.title;
    const d = parseDate(text, p.today); if (d) draft.date = d.toFormat('yyyy-LL-dd');
    const tm = parseTime(text); if (tm) draft.time = tm;
    if (draft.awaiting === 'name' && !nameMatch && /^[a-z][a-z .'-]{1,40}$/i.test(text.trim()) && words(text).length <= 4 && !svc && !d && !tm) draft.name = text.trim().split(/\s+/).slice(0, 3).map((s) => s[0].toUpperCase() + s.slice(1)).join(' ');
    const confirmed = draft.awaiting === 'confirm' && /\b(yes|yeah|yep|confirm|confirmed|ok|okay|sure|haan|ji|theek)\b/.test(low) && !d && !tm;
    if (p.consentRequired && draft.consent === 'unknown' && !draft.awaiting) {
      draft.awaiting = 'consent';
      ai.reply = 'Happy to arrange that! May we save your name and contact details in our records to arrange your appointment? Please reply yes or no.';
    } else if (confirmed) {
      Object.assign(ai.booking, { service: draft.service, date: draft.date, time: draft.time, ready_to_book: true });
      ai.reply = 'Thank you! Booking that for you now.';
      draft.awaiting = null;
      mem[key] = { ...draft, service: null, date: null, time: null };
    } else if (!draft.name) { draft.awaiting = 'name'; ai.reply = 'Happy to help with a booking! May I have your name, please?'; }
    else if (!draft.service) { draft.awaiting = 'service'; ai.reply = `Thanks ${draft.name.split(' ')[0]}! Which service would you like? For example: ${p.kb.filter((r) => r.category === 'services').slice(0, 3).map((r) => r.title.replace(/\s*\(.*\)/, '')).join(', ')}.`; }
    else if (!draft.date || !draft.time) { draft.awaiting = 'datetime'; ai.reply = `Great. Which day and time would suit you? We are open ${p.opening}–${p.closing}${p.closedDays.length ? `, closed on ${p.closedDays.map((d) => d[0].toUpperCase() + d.slice(1)).join(', ')}` : ''}.`; }
    else {
      draft.awaiting = 'confirm';
      const when = DateTime.fromISO(`${draft.date}T${draft.time}`, { zone: p.zone });
      ai.reply = `To confirm: ${draft.service} on ${when.toFormat("cccc d LLLL yyyy 'at' h:mm a")} for ${draft.name}. Reply yes to confirm.`;
      Object.assign(ai.booking, { service: draft.service, date: draft.date, time: draft.time });
    }
    ai.lead.name = draft.name; ai.lead.service_interest = draft.service;
    ai.confidence = 0.95;
  } else if (/^\s*(hi|hello|hey|salam|assalam|aoa|good (morning|afternoon|evening))\b/.test(low) && words(text).filter((x) => !/^(hi|hello|hey|salam|assalam|aoa|good|morning|afternoon|evening|there|everyone)$/.test(x)).length === 0) {
    Object.assign(ai, { intent: 'smalltalk', reply: `Hello${draft.name ? ' ' + draft.name.split(' ')[0] : ''}! I can help with our services, prices, opening hours or booking an appointment. What would you like to know?`, confidence: 1 });
  } else if (sensitive) {
    Object.assign(ai, { intent: 'handoff', reply: 'I will check that with our team and get back to you.', confidence: 0.3, needs_human: true, handoff_reason: 'request involves something not covered by the approved knowledge base' });
  } else {
    const rows = matchFaq(text, p.kb);
    if (rows.length) {
      Object.assign(ai, { intent: 'faq', reply: rows.map(faqSentence).join(' '), confidence: 0.92, kb_refs: rows.map((r) => r.id) });
      const svc = rows.find((r) => r.category === 'services'); if (svc) ai.lead.service_interest = svc.title;
    } else {
      Object.assign(ai, { intent: 'handoff', reply: 'I am not sure about that, let me check with the team.', confidence: 0.2, needs_human: true, handoff_reason: 'not in knowledge base' });
    }
  }
  if (draft.name) ai.lead.name = draft.name;
  const outText = JSON.stringify(ai);
  const inputTokens = Math.round(body.system.reduce((a, s) => a + s.text.length, 0) / 4) + Math.round(JSON.stringify(body.messages).length / 4);
  return {
    id: nextId('msg_SIM'), type: 'message', role: 'assistant', model: 'local-rule-based-responder (simulated, not Claude)', stop_reason: 'end_turn',
    content: [{ type: 'text', text: outText }],
    usage: { input_tokens: inputTokens, output_tokens: Math.round(outText.length / 4), cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    simulated: true,
    _sim: { ai, intent: ai.intent, hook },
  };
}

module.exports = { googleSheets, googleCalendar, gmail, whatsApp, httpRequest, crypto, simulateClaude };
