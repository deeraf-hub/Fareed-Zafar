#!/usr/bin/env node
// ============================================================================
// Local preview server for the AI chatbot workflow.
//   /            → chat preview (talk to the bot as a customer)
//   /walkthrough → animated recruiter walkthrough
//   /api/...     → runs the REAL workflow JSON through the mini executor with
//                  simulated providers (see preview-lib/simulators.js)
// Local demo — external services simulated. Nothing is sent anywhere.
// ============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WorkflowEngine, KIND_LABEL } = require('./preview-lib/engine');
const simulators = require('./preview-lib/simulators');
const { parseCsv } = require('./preview-lib/csv');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 8091);
const workflow = JSON.parse(fs.readFileSync(path.join(ROOT, 'n8n', 'ai-chatbot-whatsapp-instagram.json'), 'utf8'));
const knowledge = parseCsv(fs.readFileSync(path.join(ROOT, 'google-sheets', 'Knowledge.csv'), 'utf8'));
const engine = new WorkflowEngine(workflow, simulators);
const clientConfig = Object.fromEntries(workflow.nodes.find((n) => n.name === 'Client Config').parameters.assignments.assignments.map((a) => [a.name, a.value]));

// ---------------------------------------------------------------- sessions (isolated in-memory stores)
const sessions = new Map();
function newSession(id) {
  const s = { id, createdAt: new Date().toISOString(), sheets: { Knowledge: knowledge.map((r) => ({ ...r })), Leads: [], Conversations: [] }, calendar: [], outbox: [], emails: [], sim: { drafts: {} }, history: [] };
  sessions.set(id, s);
  return s;
}
const getSession = (id) => sessions.get(id) || newSession(id);
const SESSION_RE = /^[a-zA-Z0-9_-]{1,64}$/;

// ---------------------------------------------------------------- workflow map (for the technical overview)
function workflowMap() {
  const notes = workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.stickyNote').map((n) => ({ name: n.name, title: (n.parameters.content.match(/^## (.*)$/m) || [])[1], x1: n.position[0], x2: n.position[0] + n.parameters.width, content: n.parameters.content }));
  const nodes = workflow.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote').map((n) => {
    const section = notes.find((s) => n.position[0] >= s.x1 && n.position[0] < s.x2);
    const kind = { 'n8n-nodes-base.code': 'real', 'n8n-nodes-base.set': 'logic', 'n8n-nodes-base.if': 'logic', 'n8n-nodes-base.switch': 'logic', 'n8n-nodes-base.noOp': 'logic', 'n8n-nodes-base.respondToWebhook': 'logic', 'n8n-nodes-base.whatsAppTrigger': 'entry', 'n8n-nodes-base.webhook': 'entry' }[n.type] || 'simulated';
    return { name: n.name, type: n.type.replace('n8n-nodes-base.', ''), kind, section: section ? section.title : null, position: n.position };
  });
  return { name: workflow.name, nodeCount: nodes.length, sections: notes.map((s) => ({ title: s.title, content: s.content })), nodes, connections: workflow.connections, kindLabels: KIND_LABEL };
}

// ---------------------------------------------------------------- run one inbound message through the workflow
function buildEntry(msg) {
  const nowSec = String(Math.floor(Date.now() / 1000));
  const messageId = msg.message_id || `${msg.channel === 'whatsapp' ? 'wamid.DEMO' : 'm_DEMO'}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
  if (msg.channel === 'instagram') {
    return { node: 'Instagram Inbound (POST)', item: { json: {
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=SIMULATED' }, params: {}, query: {},
      body: { object: 'instagram', entry: [{ id: '17841400000000000', time: Date.now(), messaging: [{ sender: { id: msg.contact_id }, recipient: { id: '17841400000000000' }, timestamp: Date.now(), message: { mid: messageId, text: msg.text } }] }] },
    } }, messageId };
  }
  if (msg.channel === 'manychat') {
    return { node: 'ManyChat Inbound (POST)', item: { json: { headers: { 'x-chatbot-token': 'demo' }, params: {}, query: {}, body: { channel: 'instagram', contact_id: msg.contact_id, contact_name: msg.contact_name || '', text: msg.text, message_id: messageId } } }, messageId };
  }
  return { node: 'WhatsApp Trigger', item: { json: {
    messaging_product: 'whatsapp', metadata: { display_phone_number: '15550000000', phone_number_id: clientConfig.whatsapp_phone_number_id },
    contacts: [{ profile: { name: msg.contact_name || '' }, wa_id: msg.contact_id }],
    messages: [{ from: msg.contact_id, id: messageId, timestamp: nowSec, type: msg.type || 'text', ...(msg.type && msg.type !== 'text' ? { [msg.type]: { id: 'demo-media' } } : { text: { body: msg.text } }) }],
    field: 'messages',
  } }, messageId };
}

function handleMessage(session, msg) {
  if (!msg || !msg.contact_id || (!msg.text && !msg.type)) throw new Error('contact_id and text are required');
  const channel = ['whatsapp', 'instagram', 'manychat'].includes(msg.channel) ? msg.channel : 'whatsapp';
  const entry = buildEntry({ ...msg, channel });
  const contactKey = `${channel === 'manychat' ? 'instagram' : channel}:${msg.contact_id}`;
  const before = { outbox: session.outbox.length, emails: session.emails.length, calendar: session.calendar.length, leads: session.sheets.Leads.length, logs: session.sheets.Conversations.length };
  const started = Date.now();
  const result = engine.run(entry.node, [entry.item], { session, hooks: msg.hooks || {}, contactKey });
  const trace = result.trace;
  const find = (name) => trace.find((t) => t.node === name);
  const parse = result.runs['Parse Claude Response'] && result.runs['Parse Claude Response'].outputs[0][0] && result.runs['Parse Claude Response'].outputs[0][0].json;
  const finalize = result.runs['Finalize Reply'] && result.runs['Finalize Reply'].outputs[0][0] && result.runs['Finalize Reply'].outputs[0][0].json;
  const triage = result.runs['Assemble Context'] && result.runs['Assemble Context'].outputs[0][0] && result.runs['Assemble Context'].outputs[0][0].json.triage;
  const lead = session.sheets.Leads.find((r) => r.contact_key === contactKey) || null;
  const summary = {
    ok: !result.error, error: result.error, ms: Date.now() - started,
    message_id: entry.messageId, contact_key: contactKey, channel, triage: triage || null,
    reply: session.outbox.slice(before.outbox).map((m) => m.text)[0] || null,
    decision: finalize ? finalize.decision : null,
    status: finalize ? finalize.status : null,
    guardrails: parse ? parse.guard : [], kb_refs: parse ? parse.ai.kb_refs : [], intent: parse ? parse.ai.intent : null, confidence: parse ? parse.ai.confidence : null,
    booking: parse ? parse.ai.booking : null, slot: result.runs['Validate Booking Slot'] ? result.runs['Validate Booking Slot'].outputs[0][0].json.slot : null,
    claude_request: result.runs['Build Claude Request'] ? result.runs['Build Claude Request'].outputs[0][0].json.claude_request : null,
    new_emails: session.emails.slice(before.emails), new_events: session.calendar.slice(before.calendar), new_outbox: session.outbox.slice(before.outbox),
    lead, last_log: session.sheets.Conversations[session.sheets.Conversations.length - 1] || null,
    nodes_run: trace.map((t) => t.node), trace,
  };
  session.history.push({ at: new Date().toISOString(), in: { channel, contact_id: msg.contact_id, text: msg.text }, out: summary.reply, decision: summary.decision, triage: summary.triage });
  return summary;
}

// ---------------------------------------------------------------- HTTP
const STATIC = { '/': 'preview.html', '/preview.html': 'preview.html', '/walkthrough': 'walkthrough.html', '/walkthrough.html': 'walkthrough.html', '/preview.css': 'preview.css', '/preview.js': 'preview.js', '/walkthrough.js': 'walkthrough.js' };
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve, reject) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 1e6) req.destroy(); }); req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(new Error('invalid JSON body')); } }); });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && STATIC[url.pathname]) {
      const file = path.join(__dirname, STATIC[url.pathname]);
      if (!fs.existsSync(file)) return json(res, 404, { error: 'not built yet' });
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)], 'Cache-Control': 'no-store' });
      return res.end(fs.readFileSync(file));
    }
    if (url.pathname === '/api/health') return json(res, 200, { ok: true, workflow: workflow.name, nodes: Object.keys(engine.nodes).length, simulated: true });
    if (url.pathname === '/api/knowledge') return json(res, 200, { rows: knowledge, config: clientConfig });
    if (url.pathname === '/api/workflow') return json(res, 200, workflowMap());
    const m = url.pathname.match(/^\/api\/session\/([^/]+)\/(message|state|reset|lead-status|history)$/);
    if (m) {
      if (!SESSION_RE.test(m[1])) return json(res, 400, { error: 'bad session id' });
      const session = getSession(m[1]);
      const action = m[2];
      if (action === 'state' && req.method === 'GET') return json(res, 200, { id: session.id, leads: session.sheets.Leads, conversations: session.sheets.Conversations, calendar: session.calendar, outbox: session.outbox, emails: session.emails, history: session.history, simulated: true });
      if (action === 'history' && req.method === 'GET') return json(res, 200, session.history);
      if (req.method !== 'POST') return json(res, 405, { error: 'POST required' });
      const body = await readBody(req);
      if (action === 'reset') { sessions.delete(session.id); return json(res, 200, { ok: true, reset: session.id }); }
      if (action === 'lead-status') {
        const row = session.sheets.Leads.find((r) => r.contact_key === body.contact_key);
        if (!row) return json(res, 404, { error: 'no such lead' });
        row.status = body.status === 'human' ? 'human' : 'bot';
        if (row.status === 'human') row.handoff_at = new Date().toISOString();
        return json(res, 200, { ok: true, lead: row });
      }
      if (action === 'message') {
        try { return json(res, 200, handleMessage(session, body)); }
        catch (e) { return json(res, 400, { ok: false, error: e.message }); }
      }
    }
    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Local demo — external services simulated.`);
    console.log(`Chat preview:  http://localhost:${PORT}/`);
    console.log(`Walkthrough:   http://localhost:${PORT}/walkthrough`);
  });
}
module.exports = { server, handleMessage, getSession, sessions, workflowMap, knowledge, clientConfig };
