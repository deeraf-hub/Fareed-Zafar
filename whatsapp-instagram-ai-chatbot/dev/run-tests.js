// Mock n8n runtime: $input, $('Node'), DateTime — runs each Code node body.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { DateTime } = require('luxon');

const CODE = path.join(__dirname, 'code');
const src = (f) => fs.readFileSync(path.join(CODE, f), 'utf8');
const wrap = (items) => items.map((json) => ({ json }));

function run(file, inputItems, nodes = {}) {
  const $input = { all: () => inputItems, first: () => inputItems[0] };
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`Test did not provide node "${name}"`);
    const items = nodes[name];
    return { all: () => items, first: () => items[0] };
  };
  return new Function('$input', '$', 'DateTime', src(file))($input, $, DateTime);
}

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('  ✓', name); };

// ---------------------------------------------------------------- fixtures
const config = {
  client_name: 'Bright Smile Dental Clinic', business_type: 'dental clinic', timezone: 'Asia/Karachi',
  opening_time: '10:00', closing_time: '19:00', closed_days: 'Sunday', slot_minutes: 30,
  max_history_turns: 10, handoff_confidence_threshold: 0.6, human_mode_timeout_hours: 12,
  claude_model: 'claude-opus-5-5', claude_effort: 'low',
  handoff_message: 'Thanks! I have passed this to our team, they will reply shortly.',
};
const waTriggerItem = {
  messaging_product: 'whatsapp',
  metadata: { display_phone_number: '15550000000', phone_number_id: '123456789012345' },
  contacts: [{ profile: { name: 'Ayesha Khan' }, wa_id: '923001234567' }],
  messages: [{ from: '923001234567', id: 'wamid.ABC123', timestamp: '1760000000', type: 'text', text: { body: 'How much is teeth cleaning?' } }],
  field: 'messages',
};
const waStatusItem = { messaging_product: 'whatsapp', metadata: {}, statuses: [{ id: 'wamid.X', status: 'delivered', recipient_id: '923001234567' }], field: 'messages' };
const igWebhookItem = {
  headers: {}, params: {}, query: {},
  body: { object: 'instagram', entry: [{ id: '17841400000000000', time: 1760000000000, messaging: [
    { sender: { id: '1234567890123456' }, recipient: { id: '17841400000000000' }, timestamp: 1760000000000, message: { mid: 'm_ig_001', text: 'Do you do whitening? Price?' } },
  ] }] },
};
const igEchoItem = { body: { object: 'instagram', entry: [{ id: 'x', messaging: [{ sender: { id: '17841400000000000' }, recipient: { id: '1' }, timestamp: 1, message: { mid: 'm2', text: 'our reply', is_echo: true } }] }] } };
const manychatItem = { channel: 'instagram', contact_id: '999', contact_name: 'Sam', text: 'hi', message_id: 'mc1' };
const kbRows = [
  { category: 'services', title: 'Teeth Cleaning', content: 'PKR 3,500 · 30 minutes' },
  { category: 'services', title: 'Teeth Whitening', content: 'PKR 15,000 · 60 minutes' },
  { category: 'hours', title: 'Monday to Saturday', content: '10:00 AM – 7:00 PM' },
  { category: 'faq', title: 'Payment', content: 'Cash and cards' },
];

console.log('\n01 · Normalize Message');
test('WhatsApp Trigger (flattened value) → one canonical item', () => {
  const out = run('01-normalize-message.js', wrap([waTriggerItem]));
  assert.strictEqual(out.length, 1);
  const j = out[0].json;
  assert.deepStrictEqual([j.channel, j.contact_id, j.contact_key, j.contact_name, j.text, j.message_id, j.message_type],
    ['whatsapp', '923001234567', 'whatsapp:923001234567', 'Ayesha Khan', 'How much is teeth cleaning?', 'wamid.ABC123', 'text']);
});
test('raw Meta WhatsApp body (entry/changes) → same result', () => {
  const raw = { object: 'whatsapp_business_account', entry: [{ id: '1', changes: [{ field: 'messages', value: waTriggerItem }] }] };
  const out = run('01-normalize-message.js', wrap([raw]));
  assert.strictEqual(out[0].json.text, 'How much is teeth cleaning?');
});
test('delivery status payload → no output (execution ends)', () => {
  assert.strictEqual(run('01-normalize-message.js', wrap([waStatusItem])).length, 0);
});
test('image message → readable placeholder text', () => {
  const img = { ...waTriggerItem, messages: [{ from: '923001234567', id: 'w2', timestamp: '1760000000', type: 'image', image: { id: 'x' } }] };
  assert.match(run('01-normalize-message.js', wrap([img]))[0].json.text, /sent a image message/);
});
test('two quick messages from the same sender → joined into one turn', () => {
  const two = { ...waTriggerItem, messages: [waTriggerItem.messages[0], { from: '923001234567', id: 'w3', timestamp: '1760000001', type: 'text', text: { body: 'and whitening?' } }] };
  const j = run('01-normalize-message.js', wrap([two]))[0].json;
  assert.strictEqual(j.text, 'How much is teeth cleaning?\nand whitening?');
  assert.strictEqual(j.message_id, 'wamid.ABC123');
});
test('Instagram webhook (generic Webhook node wrapper) → canonical item', () => {
  const j = run('01-normalize-message.js', wrap([igWebhookItem]))[0].json;
  assert.deepStrictEqual([j.channel, j.contact_id, j.contact_key, j.text, j.message_id], ['instagram', '1234567890123456', 'instagram:1234567890123456', 'Do you do whitening? Price?', 'm_ig_001']);
});
test('Instagram echo of our own reply → ignored', () => {
  assert.strictEqual(run('01-normalize-message.js', wrap([igEchoItem])).length, 0);
});
test('ManyChat External Request JSON → canonical item', () => {
  const j = run('01-normalize-message.js', wrap([manychatItem]))[0].json;
  assert.deepStrictEqual([j.channel, j.contact_key, j.contact_name, j.text], ['instagram', 'instagram:999', 'Sam', 'hi']);
});

console.log('\n02 · Assemble Context');
const msg = run('01-normalize-message.js', wrap([waTriggerItem]))[0].json;
const nodesFor = (leads, logs) => ({
  'Normalize Message': wrap([msg]), 'Client Config': wrap([config]), 'Load Knowledge Base': wrap(kbRows),
  'Lookup Lead': wrap(leads.length ? leads : [{}]), 'Load Conversation History': wrap(logs.length ? logs : [{}]),
});
test('new customer → triage bot, KB grouped, empty history', () => {
  const j = run('02-assemble-context.js', wrap(kbRows), nodesFor([], []))[0].json;
  assert.strictEqual(j.triage, 'bot');
  assert.strictEqual(j.lead, null);
  assert.deepStrictEqual(j.history, []);
  assert.match(j.kb_text, /^## SERVICES\n- Teeth Cleaning: PKR 3,500 · 30 minutes\n- Teeth Whitening/);
  assert.match(j.kb_text, /## HOURS[\s\S]*## FAQ/);
});
test('history → ordered user/assistant turns, capped at max_history_turns', () => {
  const logs = [];
  for (let i = 0; i < 14; i++) logs.push({ contact_key: msg.contact_key, timestamp: `2026-10-0${1 + (i % 9)}T1${i % 10}:00:00.000+05:00`, customer_message: `q${i}`, bot_reply: `a${i}`, message_id: `old${i}` });
  const j = run('02-assemble-context.js', wrap(kbRows), nodesFor([], logs))[0].json;
  assert.strictEqual(j.history.length, 20);
  assert.strictEqual(j.history[0].role, 'user');
  assert.strictEqual(j.history[19].role, 'assistant');
});
test('rows for OTHER contacts are ignored even if the sheet filter failed', () => {
  const logs = [{ contact_key: 'whatsapp:111', timestamp: '2026-10-01T10:00:00.000+05:00', customer_message: 'x', bot_reply: 'y', message_id: 'wamid.ABC123' }];
  const j = run('02-assemble-context.js', wrap(kbRows), nodesFor([{ contact_key: 'whatsapp:111', status: 'human', handoff_at: DateTime.now().toISO() }], logs))[0].json;
  assert.strictEqual(j.triage, 'bot');
});
test('duplicate delivery (same message_id already logged) → ignore', () => {
  const logs = [{ contact_key: msg.contact_key, timestamp: '2026-10-01T10:00:00.000+05:00', customer_message: 'x', bot_reply: 'y', message_id: 'wamid.ABC123' }];
  assert.strictEqual(run('02-assemble-context.js', wrap(kbRows), nodesFor([], logs))[0].json.triage, 'ignore');
});
test('lead in human mode (recent handoff) → human', () => {
  const lead = { contact_key: msg.contact_key, status: 'human', handoff_at: DateTime.now().minus({ hours: 2 }).toISO() };
  assert.strictEqual(run('02-assemble-context.js', wrap(kbRows), nodesFor([lead], []))[0].json.triage, 'human');
});
test('human mode older than the timeout → bot resumes automatically', () => {
  const lead = { contact_key: msg.contact_key, status: 'human', handoff_at: DateTime.now().minus({ hours: 20 }).toISO() };
  assert.strictEqual(run('02-assemble-context.js', wrap(kbRows), nodesFor([lead], []))[0].json.triage, 'bot');
});
test('handoff_at stored as a Sheets date serial is still understood', () => {
  const serial = DateTime.now().minus({ hours: 1 }).toMillis() / 86400000 + 25569;
  const lead = { contact_key: msg.contact_key, status: 'human', handoff_at: serial };
  assert.strictEqual(run('02-assemble-context.js', wrap(kbRows), nodesFor([lead], []))[0].json.triage, 'human');
});

console.log('\n03 · Build Claude Request');
const ctx = run('02-assemble-context.js', wrap(kbRows), nodesFor([], [{ contact_key: msg.contact_key, timestamp: '2026-10-01T10:00:00.000+05:00', customer_message: 'hi', bot_reply: 'Hello! How can I help?', message_id: 'old' }]))[0].json;
const built = run('03-build-claude-request.js', wrap([ctx]))[0].json;
test('request shape: model, structured output, cached system prefix, no temperature / tool_choice', () => {
  const r = built.claude_request;
  assert.strictEqual(r.model, 'claude-opus-5-5');
  assert.strictEqual(r.output_config.format.type, 'json_schema');
  assert.strictEqual(r.output_config.effort, 'low');
  assert.strictEqual(r.system[0].cache_control.type, 'ephemeral');
  assert.ok(!('temperature' in r) && !('tool_choice' in r) && !('tools' in r));
  assert.ok(r.system[0].text.includes('APPROVED KNOWLEDGE BASE') && r.system[0].text.includes('PKR 3,500'));
  assert.match(r.system[1].text, /TODAY: \w+, \d+ \w+ 2026/);
});
test('messages = history + current customer message, first role is user', () => {
  const m = built.claude_request.messages;
  assert.deepStrictEqual(m.map((x) => x.role), ['user', 'assistant', 'user']);
  assert.strictEqual(m[2].content, 'How much is teeth cleaning?');
});
test('schema: every object has additionalProperties:false and required lists', () => {
  const walk = (s) => { if (s.type === 'object') { assert.strictEqual(s.additionalProperties, false); assert.deepStrictEqual(Object.keys(s.properties).sort(), [...s.required].sort()); Object.values(s.properties).forEach(walk); } };
  walk(built.claude_request.output_config.format.schema);
});

console.log('\n04 · Parse Claude Response + guardrails');
const aiJson = (over = {}) => JSON.stringify({ intent: 'faq', reply: 'Teeth cleaning is PKR 3,500 and takes 30 minutes.', confidence: 0.95, needs_human: false, handoff_reason: null,
  lead: { name: null, phone: null, email: null, service_interest: 'Teeth Cleaning' }, booking: { requested: false, service: null, date: null, time: null, ready_to_book: false }, ...over });
const apiRes = (text, extra = {}) => ({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text }], usage: { input_tokens: 900, output_tokens: 80, cache_read_input_tokens: 400 }, ...extra });
const parse = (res) => run('04-parse-claude-response.js', wrap([res]), { 'Build Claude Request': wrap([built]) })[0].json;
test('good answer with a KB price → decision answer, lead merged from profile', () => {
  const j = parse(apiRes(aiJson()));
  assert.strictEqual(j.decision, 'answer');
  assert.deepStrictEqual(j.guard, []);
  assert.deepStrictEqual(j.lead_merged, { name: 'Ayesha Khan', phone: '923001234567', email: '', service_interest: 'Teeth Cleaning' });
  assert.strictEqual(j.tokens_used, 1380);
});
test('PRICE GUARD: invented price → handoff', () => {
  const j = parse(apiRes(aiJson({ reply: 'Teeth cleaning costs PKR 2,000.' })));
  assert.strictEqual(j.decision, 'handoff');
  assert.match(j.guard[0], /price_not_in_knowledge_base: PKR 2,000/);
});
test('low confidence → handoff', () => {
  const j = parse(apiRes(aiJson({ confidence: 0.3 })));
  assert.strictEqual(j.decision, 'handoff');
  assert.match(j.guard[0], /low_confidence/);
});
test('model asks for a human → handoff with its reason', () => {
  const j = parse(apiRes(aiJson({ needs_human: true, handoff_reason: 'not in knowledge base' })));
  assert.strictEqual(j.decision, 'handoff');
  assert.deepStrictEqual(j.guard, ['model: not in knowledge base']);
});
test('booking ready with all fields → decision book', () => {
  const j = parse(apiRes(aiJson({ intent: 'booking', booking: { requested: true, service: 'Teeth Cleaning', date: '2026-10-14', time: '15:00', ready_to_book: true } })));
  assert.strictEqual(j.decision, 'book');
});
test('booking ready but missing time → stays answer (model keeps collecting)', () => {
  const j = parse(apiRes(aiJson({ intent: 'booking', booking: { requested: true, service: 'Teeth Cleaning', date: '2026-10-14', time: null, ready_to_book: true } })));
  assert.strictEqual(j.decision, 'answer');
});
test('API error item (HTTP node continued on error) → handoff', () => {
  const j = parse({ error: { message: 'timeout' } });
  assert.strictEqual(j.decision, 'handoff');
  assert.deepStrictEqual(j.guard, ['ai_api_error', 'empty_reply']);
});
test('refusal / truncation / non-JSON text → handoff', () => {
  assert.strictEqual(parse(apiRes(aiJson(), { stop_reason: 'refusal' })).guard[0], 'ai_refusal');
  assert.strictEqual(parse(apiRes(aiJson(), { stop_reason: 'max_tokens' })).guard[0], 'ai_output_truncated');
  assert.strictEqual(parse(apiRes('Sure! Here is my answer')).guard[0], 'ai_output_unreadable');
});
test('customer explicitly asks for a person → handoff even if the model answered', () => {
  const b2 = { ...built, message: { ...built.message, text: 'I want to speak to a person please' } };
  const j = run('04-parse-claude-response.js', wrap([apiRes(aiJson())]), { 'Build Claude Request': wrap([b2]) })[0].json;
  assert.deepStrictEqual(j.guard, ['customer_asked_for_human']);
});

console.log('\n05 · Validate Booking Slot');
const nextWeekday = (weekday) => { let d = DateTime.now().setZone('Asia/Karachi').plus({ days: 1 }); while (d.weekday !== weekday) d = d.plus({ days: 1 }); return d.toFormat('yyyy-LL-dd'); };
const slot = (date, time) => run('05-validate-booking-slot.js', wrap([{ config, ai: { booking: { service: 'Teeth Cleaning', date, time } } }]))[0].json.slot;
test('valid future weekday inside hours → valid with ISO start/end (+05:00) and human text', () => {
  const s = slot(nextWeekday(2), '15:00');
  assert.strictEqual(s.valid, true);
  assert.match(s.start_iso, /T15:00:00\.000\+05:00$/);
  assert.match(s.end_iso, /T15:30:00\.000\+05:00$/);
  assert.match(s.human, /^Tuesday \d+ \w+ 2026 at 3:00 PM$/);
});
test('Sunday → closed_day', () => assert.strictEqual(slot(nextWeekday(7), '15:00').error, 'closed_day'));
test('21:00 → outside_hours; 18:45 (would end after closing) → outside_hours; 10:00 → ok', () => {
  assert.strictEqual(slot(nextWeekday(3), '21:00').error, 'outside_hours');
  assert.strictEqual(slot(nextWeekday(3), '18:45').error, 'outside_hours');
  assert.strictEqual(slot(nextWeekday(3), '10:00').valid, true);
});
test('yesterday → in_the_past; garbage → invalid_datetime', () => {
  assert.strictEqual(slot(DateTime.now().minus({ days: 1 }).toFormat('yyyy-LL-dd'), '12:00').error, 'in_the_past');
  assert.strictEqual(slot('next tuesday', 'afternoon').error, 'invalid_datetime');
});

console.log('\n06 · Finalize Reply');
const fin = (r, channel = 'whatsapp') => run('06-finalize-reply.js', wrap([r]), { 'Normalize Message': wrap([{ ...msg, channel }]), 'Client Config': wrap([config]) })[0].json;
test('markdown cleaned, WhatsApp keeps *bold*', () => {
  const j = fin({ reply_text: '## Prices\n**Teeth cleaning**: PKR 3,500', decision: 'answer', status: 'bot' });
  assert.strictEqual(j.reply_text, 'Prices\n*Teeth cleaning*: PKR 3,500');
  assert.deepStrictEqual([j.channel, j.contact_id, j.contact_key, j.decision, j.status, j.booking_confirmed], ['whatsapp', '923001234567', 'whatsapp:923001234567', 'answer', 'bot', false]);
});
test('Instagram → asterisks removed; empty reply → handoff message; long reply truncated', () => {
  assert.strictEqual(fin({ reply_text: '**Hi**' }, 'instagram').reply_text, 'Hi');
  assert.strictEqual(fin({ reply_text: '' }).reply_text, config.handoff_message);
  assert.strictEqual(fin({ reply_text: 'x'.repeat(1500) }).reply_text.length, 1000);
});

console.log(`\nAll ${passed} tests passed.`);
