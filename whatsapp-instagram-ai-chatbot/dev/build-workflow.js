// Generates the importable n8n workflows from the Code-node sources in ./code
//   ../n8n/ai-chatbot-whatsapp-instagram.json   (main workflow)
//   ../n8n/error-alert-workflow.json            (error workflow: emails the owner when a run fails)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT_DIR = process.argv[2] ? path.dirname(process.argv[2]) : path.join(__dirname, '..', 'n8n');
const OUT = path.join(OUT_DIR, 'ai-chatbot-whatsapp-instagram.json');
const OUT_ERR = path.join(OUT_DIR, 'error-alert-workflow.json');
const code = (f) => fs.readFileSync(path.join(__dirname, 'code', f), 'utf8');
const uuid = (seed) => { const h = crypto.createHash('md5').update('n8n-chatbot:' + seed).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };

// ----------------------------------------------------------------- helpers
const X = 260, Y = 200;
const pos = (col, row) => [Math.round(col * X), Math.round(row * Y)];
const CFG = (field) => `$('Client Config').first().json.${field}`;
const FIN = (field) => `$('Finalize Reply').first().json.${field}`;
const PARSE = (field) => `$('Parse Claude Response').first().json.${field}`;
const MSG = (field) => `$('Normalize Message').first().json.${field}`;
const SLOT = (field) => `$('Validate Booking Slot').first().json.${field}`;
const NOW_LOCAL = `$now.setZone(${CFG('timezone')}).toISO()`;

function makeGraph() {
  const nodes = [];
  const connections = {};
  const node = (name, type, typeVersion, position, parameters, extra = {}) => {
    if (nodes.some((n) => n.name === name)) throw new Error('duplicate node name ' + name);
    nodes.push({ parameters, id: uuid(name), name, type, typeVersion, position, ...extra });
    return name;
  };
  const connect = (from, to, fromIndex = 0) => {
    connections[from] = connections[from] || { main: [] };
    while (connections[from].main.length <= fromIndex) connections[from].main.push([]);
    connections[from].main[fromIndex].push({ node: to, type: 'main', index: 0 });
  };
  const sticky = (name, content, position, width, height, color) => {
    nodes.push({ parameters: { content, height, width, color }, id: uuid(name), name, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position });
  };
  return { nodes, connections, node, connect, sticky };
}
const assign = (fields) => ({
  assignments: { assignments: Object.entries(fields).map(([name, [value, type]]) => ({ id: uuid('assign:' + name + ':' + value), name, value, type })) },
  includeOtherFields: false,
  options: {},
});
const condOpts = { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 };
const cond = (leftValue, operator, rightValue = '') => ({ id: uuid('cond:' + leftValue + rightValue), leftValue, rightValue, operator });
const isTrue = (leftValue) => ({ id: uuid('cond:' + leftValue), leftValue, rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } });
const ifParams = (conditions) => ({ conditions: { options: condOpts, conditions, combinator: 'and' }, options: {} });
const switchParams = (expr, keys) => ({
  rules: { values: keys.map((k) => ({ conditions: { options: condOpts, conditions: [cond(expr, { type: 'string', operation: 'equals' }, k)], combinator: 'and' }, renameOutput: true, outputKey: k })) },
  options: {},
});
const rlc = (value, mode) => ({ __rl: true, value, mode });
const sheetDoc = () => rlc(`={{ ${CFG('google_sheet_id')} }}`, 'id');
const sheetTab = (name) => rlc(name, 'name');
const calendarRlc = () => rlc(`={{ ${CFG('google_calendar_id')} }}`, 'id');
const googleRetry = { retryOnFail: true, maxTries: 3, waitBetweenTries: 2000 };

// Column layout of the Google Sheets tabs (single source of truth for the CSV templates)
const LEAD_COLUMNS = ['contact_key', 'channel', 'contact_id', 'name', 'phone', 'email', 'service_interest', 'consent_at', 'last_intent', 'status', 'handoff_at', 'handoff_reason', 'booking_datetime', 'calendar_event_link', 'last_message', 'last_message_at', 'first_seen_at'];
const LOG_COLUMNS = ['timestamp', 'contact_key', 'channel', 'customer_name', 'customer_message', 'bot_reply', 'intent', 'confidence', 'decision', 'guardrails', 'kb_refs', 'message_id', 'tokens_used'];

// ============================================================================
// MAIN WORKFLOW
// ============================================================================
function buildMain() {
  const g = makeGraph();
  const { node, connect, sticky } = g;
  const setNode = (name, position, fields) => node(name, 'n8n-nodes-base.set', 3.4, position, assign(fields));
  const ifNode = (name, position, conditions) => node(name, 'n8n-nodes-base.if', 2.2, position, ifParams(conditions));
  const switchNode = (name, position, expr, keys) => node(name, 'n8n-nodes-base.switch', 3.2, position, switchParams(expr, keys));
  const sheetsRead = (name, position, tab, filterColumn) => node(name, 'n8n-nodes-base.googleSheets', 4.7, position, {
    authentication: 'oAuth2', resource: 'sheet', operation: 'read',
    documentId: sheetDoc(), sheetName: sheetTab(tab),
    ...(filterColumn ? { filtersUI: { values: [{ lookupColumn: filterColumn, lookupValue: `={{ ${MSG('contact_key')} }}` }] }, combineFilters: 'AND' } : {}),
    options: {},
  }, { alwaysOutputData: true, executeOnce: true, ...googleRetry });
  const sheetsAppend = (name, position, tab) => node(name, 'n8n-nodes-base.googleSheets', 4.7, position, {
    authentication: 'oAuth2', resource: 'sheet', operation: 'append',
    documentId: sheetDoc(), sheetName: sheetTab(tab),
    columns: { mappingMode: 'autoMapInputData', value: null, matchingColumns: [], schema: [] },
    options: {},
  }, { executeOnce: true, ...googleRetry });
  const gmail = (name, position, subject, message) => node(name, 'n8n-nodes-base.gmail', 2.2, position, {
    authentication: 'oAuth2', resource: 'message', operation: 'send',
    sendTo: `={{ ${CFG('owner_email')} }}`,
    subject, emailType: 'text', message,
    options: { appendAttribution: false },
  }, { executeOnce: true, ...googleRetry });

  // ================================================================ SECTION 1 · Inbound channels (cols 0-3)
  node('WhatsApp Trigger', 'n8n-nodes-base.whatsAppTrigger', 1, pos(0, -0.3), { updates: ['messages'], options: { messageStatusUpdates: [] } }, { webhookId: uuid('wh:whatsapp') });
  node('ManyChat Inbound (POST)', 'n8n-nodes-base.webhook', 2, pos(0, 0.4), { httpMethod: 'POST', path: 'manychat-inbound', authentication: 'headerAuth', responseMode: 'onReceived', options: {} }, { webhookId: uuid('wh:manychat-post') });
  node('Instagram Inbound (POST)', 'n8n-nodes-base.webhook', 2, pos(0, 1.1), { httpMethod: 'POST', path: 'instagram-inbound', responseMode: 'onReceived', options: { rawBody: true } }, { webhookId: uuid('wh:instagram-post') });
  node('Verify Instagram Signature', 'n8n-nodes-base.crypto', 2, pos(1, 1.1), {
    action: 'hmac', type: 'SHA256', binaryData: true, binaryPropertyName: 'data', dataPropertyName: 'expected_signature', encoding: 'hex',
  });
  ifNode('Signature Valid?', pos(2, 1.1), [
    cond("={{ $json.headers['x-hub-signature-256'] || '' }}", { type: 'string', operation: 'equals' }, "={{ 'sha256=' + $json.expected_signature }}"),
  ]);
  node('Reject Forged Request', 'n8n-nodes-base.noOp', 1, pos(3, 1.5), {});
  node('Instagram Verify (GET)', 'n8n-nodes-base.webhook', 2, pos(0, 2.6), { httpMethod: 'GET', path: 'instagram-inbound', responseMode: 'responseNode', options: {} }, { webhookId: uuid('wh:instagram-get') });
  ifNode('Verify Token OK?', pos(1, 2.6), [
    cond("={{ $json.query['hub.mode'] }}", { type: 'string', operation: 'equals' }, 'subscribe'),
    cond("={{ $json.query['hub.verify_token'] }}", { type: 'string', operation: 'equals' }, 'CHANGE_ME_instagram_verify_token'),
  ]);
  node('Respond: hub.challenge', 'n8n-nodes-base.respondToWebhook', 1.1, pos(2, 2.2), { respondWith: 'text', responseBody: "={{ $('Instagram Verify (GET)').first().json.query['hub.challenge'] }}", options: { responseCode: 200 } });
  node('Respond: 403 Forbidden', 'n8n-nodes-base.respondToWebhook', 1.1, pos(2, 3.0), { respondWith: 'text', responseBody: 'Verification failed', options: { responseCode: 403 } });
  node('Normalize Message', 'n8n-nodes-base.code', 2, pos(3, 0.5), { jsCode: code('01-normalize-message.js') });

  connect('WhatsApp Trigger', 'Normalize Message');
  connect('ManyChat Inbound (POST)', 'Normalize Message');
  connect('Instagram Inbound (POST)', 'Verify Instagram Signature');
  connect('Verify Instagram Signature', 'Signature Valid?');
  connect('Signature Valid?', 'Normalize Message', 0);
  connect('Signature Valid?', 'Reject Forged Request', 1);
  connect('Instagram Verify (GET)', 'Verify Token OK?');
  connect('Verify Token OK?', 'Respond: hub.challenge', 0);
  connect('Verify Token OK?', 'Respond: 403 Forbidden', 1);

  // ================================================================ SECTION 2 · Context (cols 4-9)
  setNode('Client Config', pos(4, 0.5), {
    client_name: ['Bright Smile Dental Clinic', 'string'],
    business_type: ['dental clinic', 'string'],
    timezone: ['Asia/Karachi', 'string'],
    opening_time: ['10:00', 'string'],
    closing_time: ['19:00', 'string'],
    closed_days: ['Sunday', 'string'],
    slot_minutes: [30, 'number'],
    owner_name: ['Dr. Sara', 'string'],
    owner_email: ['owner@example.com', 'string'],
    google_sheet_id: ['PASTE_GOOGLE_SHEET_ID', 'string'],
    google_calendar_id: ['yourname@gmail.com', 'string'],
    whatsapp_phone_number_id: ['PASTE_WHATSAPP_PHONE_NUMBER_ID', 'string'],
    instagram_api_base_url: ['https://graph.facebook.com/v23.0', 'string'],
    instagram_page_id: ['PASTE_FACEBOOK_PAGE_ID', 'string'],
    claude_model: ['claude-opus-5-5', 'string'],
    claude_effort: ['low', 'string'],
    reply_mode: ['assistant', 'string'],
    require_consent: [false, 'boolean'],
    handoff_confidence_threshold: [0.6, 'number'],
    max_history_turns: [10, 'number'],
    human_mode_timeout_hours: [12, 'number'],
    handoff_message: ["Thanks for your message! I've passed this to our team and someone will get back to you shortly.", 'string'],
  });
  sheetsRead('Load Knowledge Base', pos(5, 0.5), 'Knowledge', null);
  sheetsRead('Lookup Lead', pos(6, 0.5), 'Leads', 'contact_key');
  sheetsRead('Load Conversation History', pos(7, 0.5), 'Conversations', 'contact_key');
  node('Assemble Context', 'n8n-nodes-base.code', 2, pos(8, 0.5), { jsCode: code('02-assemble-context.js') });
  switchNode('Triage', pos(9, 0.5), '={{ $json.triage }}', ['bot', 'human', 'ignore']);
  node('Ignore Duplicate', 'n8n-nodes-base.noOp', 1, pos(10, 2.5), {});

  setNode('Human Mode Log Row', pos(10, 1.5), {
    timestamp: [`={{ ${NOW_LOCAL} }}`, 'string'],
    contact_key: ['={{ $json.message.contact_key }}', 'string'],
    channel: ['={{ $json.message.channel }}', 'string'],
    customer_name: ['={{ ($json.lead || {}).name || $json.message.contact_name }}', 'string'],
    customer_message: ['={{ $json.message.text }}', 'string'],
    bot_reply: ['', 'string'],
    intent: ['human_mode', 'string'],
    confidence: ['', 'string'],
    decision: ['human', 'string'],
    guardrails: ['', 'string'],
    kb_refs: ['', 'string'],
    message_id: ['={{ $json.message.message_id }}', 'string'],
    tokens_used: ['', 'string'],
  });
  sheetsAppend('Log Message (Human Mode)', pos(11, 1.5), 'Conversations');
  gmail('Notify Owner (Human Mode)', pos(12, 1.5),
    `=💬 New message from {{ $('Human Mode Log Row').first().json.customer_name || 'a customer' }} – you are handling this chat ({{ ${CFG('client_name')} }})`,
    [
      `=Hi {{ ${CFG('owner_name')} }},`,
      '',
      'A customer you are handling personally sent a new message. The assistant stayed silent.',
      '',
      `Customer: {{ $('Human Mode Log Row').first().json.customer_name || 'unknown' }}`,
      `Channel: {{ ${MSG('channel')} }} ({{ ${MSG('contact_id')} }})`,
      '',
      'Message:',
      `"{{ ${MSG('text')} }}"`,
      '',
      'Reply directly from the WhatsApp Business app or the Instagram inbox.',
      `To let the assistant take over again, open the Leads sheet and set status = bot (it also resumes automatically after {{ ${CFG('human_mode_timeout_hours')} }} hours).`,
      `Leads sheet: https://docs.google.com/spreadsheets/d/{{ ${CFG('google_sheet_id')} }}`,
    ].join('\n'));

  connect('Normalize Message', 'Client Config');
  connect('Client Config', 'Load Knowledge Base');
  connect('Load Knowledge Base', 'Lookup Lead');
  connect('Lookup Lead', 'Load Conversation History');
  connect('Load Conversation History', 'Assemble Context');
  connect('Assemble Context', 'Triage');
  connect('Triage', 'Build Claude Request', 0);
  connect('Triage', 'Human Mode Log Row', 1);
  connect('Triage', 'Ignore Duplicate', 2);
  connect('Human Mode Log Row', 'Log Message (Human Mode)');
  connect('Log Message (Human Mode)', 'Notify Owner (Human Mode)');

  // ================================================================ SECTION 3 · AI brain + guardrails (cols 10-13)
  node('Build Claude Request', 'n8n-nodes-base.code', 2, pos(10, 0.5), { jsCode: code('03-build-claude-request.js') });
  node('Ask Claude', 'n8n-nodes-base.httpRequest', 4.2, pos(11, 0.5), {
    method: 'POST',
    url: 'https://api.anthropic.com/v1/messages',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'anthropicApi',
    sendHeaders: true,
    specifyHeaders: 'keypair',
    headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }] },
    sendBody: true,
    contentType: 'json',
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json.claude_request) }}',
    options: { timeout: 60000 },
  }, { retryOnFail: true, maxTries: 2, waitBetweenTries: 1500, onError: 'continueRegularOutput' });
  node('Parse Claude Response', 'n8n-nodes-base.code', 2, pos(12, 0.5), { jsCode: code('04-parse-claude-response.js') });
  switchNode('Route Decision', pos(13, 0.5), '={{ $json.decision }}', ['answer', 'book', 'handoff']);

  connect('Build Claude Request', 'Ask Claude');
  connect('Ask Claude', 'Parse Claude Response');
  connect('Parse Claude Response', 'Route Decision');

  // ================================================================ SECTION 4 · Actions (cols 14-23)
  const replyFields = (reply_text, decision, status, extra = {}) => ({
    reply_text: [reply_text, 'string'],
    decision: [decision, 'string'],
    status: [status, 'string'],
    booking_confirmed: [false, 'boolean'],
    booking_datetime: ['', 'string'],
    calendar_event_link: ['', 'string'],
    ...extra,
  });
  const hoursLine = `We're open {{ ${CFG('opening_time')} }}–{{ ${CFG('closing_time')} }}, closed on {{ ${CFG('closed_days')} }}.`;

  setNode('Answer Reply', pos(14, -0.5), replyFields('={{ $json.ai.reply }}', 'answer', 'bot'));

  node('Validate Booking Slot', 'n8n-nodes-base.code', 2, pos(14, 0.5), { jsCode: code('05-validate-booking-slot.js') });
  ifNode('Slot Valid?', pos(15, 0.5), [isTrue('={{ $json.slot.valid }}')]);
  node('Check Calendar Availability', 'n8n-nodes-base.googleCalendar', 1.3, pos(16, 0.2), {
    resource: 'calendar', operation: 'availability',
    calendar: calendarRlc(),
    timeMin: '={{ $json.slot.start_iso }}',
    timeMax: '={{ $json.slot.end_iso }}',
    options: { outputFormat: 'availability' },
  }, googleRetry);
  ifNode('Slot Free?', pos(17, 0.2), [isTrue('={{ $json.available }}')]);
  node('Create Calendar Event', 'n8n-nodes-base.googleCalendar', 1.3, pos(18, -0.1), {
    resource: 'event', operation: 'create',
    calendar: calendarRlc(),
    start: `={{ ${SLOT('slot.start_iso')} }}`,
    end: `={{ ${SLOT('slot.end_iso')} }}`,
    useDefaultReminders: true,
    additionalFields: {
      summary: `={{ ${SLOT('ai.booking.service')} }} – {{ ${PARSE('lead_merged.name')} || 'customer' }}`,
      description: [
        `=Booked by the AI assistant via {{ ${MSG('channel')} }}.`,
        `Customer: {{ ${PARSE('lead_merged.name')} || 'unknown' }}`,
        `Phone: {{ ${PARSE('lead_merged.phone')} || '-' }}`,
        `Contact id: {{ ${MSG('contact_id')} }}`,
        `Service: {{ ${SLOT('ai.booking.service')} }}`,
        `Last message: "{{ ${MSG('text')} }}"`,
      ].join('\n'),
    },
  }, googleRetry);
  node('List Events In Slot', 'n8n-nodes-base.googleCalendar', 1.3, pos(19, -0.1), {
    resource: 'event', operation: 'getAll',
    calendar: calendarRlc(),
    returnAll: true,
    timeMin: `={{ ${SLOT('slot.start_iso')} }}`,
    timeMax: `={{ ${SLOT('slot.end_iso')} }}`,
    options: {},
  }, { alwaysOutputData: true, executeOnce: true, ...googleRetry });
  node('Resolve Booking Race', 'n8n-nodes-base.code', 2, pos(20, -0.1), { jsCode: code('07-resolve-booking-race.js') });
  ifNode('We Keep The Slot?', pos(21, -0.1), [isTrue('={{ $json.keep }}')]);
  node('Delete Our Event', 'n8n-nodes-base.googleCalendar', 1.3, pos(22, 0.3), {
    resource: 'event', operation: 'delete',
    calendar: calendarRlc(),
    eventId: '={{ $json.our_event_id }}',
    options: {},
  }, googleRetry);
  setNode('Booking Confirmed Reply', pos(22, -0.4), replyFields(
    [
      '=✅ Your appointment is confirmed!',
      '',
      `Service: {{ ${SLOT('ai.booking.service')} }}`,
      `When: {{ ${SLOT('slot.human')} }}`,
      `Name: {{ ${PARSE('lead_merged.name')} }}`,
      '',
      `See you at {{ ${CFG('client_name')} }}. Reply here if you need to change it.`,
    ].join('\n'), 'book', 'bot', {
      booking_confirmed: [true, 'boolean'],
      booking_datetime: [`={{ ${SLOT('slot.start_iso')} }}`, 'string'],
      calendar_event_link: ["={{ $('Create Calendar Event').first().json.htmlLink || '' }}", 'string'],
    }));
  setNode('Slot Taken Reply', pos(23, 0.6), replyFields(
    `=Sorry, {{ ${SLOT('slot.human')} }} is already booked. Could you suggest another date or time? ${hoursLine}`, 'answer', 'bot'));
  setNode('Invalid Slot Reply', pos(16, 1.1), replyFields(
    `={{ $json.slot.error_text }} ${hoursLine} Which day and time would suit you?`, 'answer', 'bot'));
  setNode('Handoff Reply', pos(14, 1.8), replyFields(`={{ ${CFG('handoff_message')} }}`, 'handoff', 'human'));

  connect('Route Decision', 'Answer Reply', 0);
  connect('Route Decision', 'Validate Booking Slot', 1);
  connect('Route Decision', 'Handoff Reply', 2);
  connect('Validate Booking Slot', 'Slot Valid?');
  connect('Slot Valid?', 'Check Calendar Availability', 0);
  connect('Slot Valid?', 'Invalid Slot Reply', 1);
  connect('Check Calendar Availability', 'Slot Free?');
  connect('Slot Free?', 'Create Calendar Event', 0);
  connect('Slot Free?', 'Slot Taken Reply', 1);
  connect('Create Calendar Event', 'List Events In Slot');
  connect('List Events In Slot', 'Resolve Booking Race');
  connect('Resolve Booking Race', 'We Keep The Slot?');
  connect('We Keep The Slot?', 'Booking Confirmed Reply', 0);
  connect('We Keep The Slot?', 'Delete Our Event', 1);
  connect('Delete Our Event', 'Slot Taken Reply');

  // ================================================================ SECTION 5 · Send (cols 24-26)
  node('Finalize Reply', 'n8n-nodes-base.code', 2, pos(24, 0.5), { jsCode: code('06-finalize-reply.js') });
  switchNode('Route by Channel', pos(25, 0.5), '={{ $json.channel }}', ['whatsapp', 'instagram']);
  node('Send WhatsApp Reply', 'n8n-nodes-base.whatsApp', 1.1, pos(26, 0.1), {
    resource: 'message', operation: 'send',
    phoneNumberId: `={{ ${CFG('whatsapp_phone_number_id')} }}`,
    recipientPhoneNumber: '={{ $json.contact_id }}',
    messageType: 'text',
    textBody: '={{ $json.reply_text }}',
    additionalFields: {},
  }, { retryOnFail: true, maxTries: 2, waitBetweenTries: 1500 });
  node('Send Instagram Reply', 'n8n-nodes-base.httpRequest', 4.2, pos(26, 0.9), {
    method: 'POST',
    url: `={{ ${CFG('instagram_api_base_url')} }}/{{ ${CFG('instagram_page_id')} }}/messages`,
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    contentType: 'json',
    specifyBody: 'json',
    jsonBody: "={{ JSON.stringify({ recipient: { id: $json.contact_id }, messaging_type: 'RESPONSE', message: { text: $json.reply_text } }) }}",
    options: { timeout: 20000 },
  }, { retryOnFail: true, maxTries: 2, waitBetweenTries: 1500 });

  for (const n of ['Answer Reply', 'Booking Confirmed Reply', 'Slot Taken Reply', 'Invalid Slot Reply', 'Handoff Reply']) connect(n, 'Finalize Reply');
  connect('Finalize Reply', 'Route by Channel');
  connect('Route by Channel', 'Send WhatsApp Reply', 0);
  connect('Route by Channel', 'Send Instagram Reply', 1);

  // ================================================================ SECTION 6 · Lead capture, log, owner alerts (cols 27-32)
  const existingLead = `($('Assemble Context').first().json.lead || {})`;
  const personal = (field) => `={{ ${PARSE('save_personal_details')} ? ${PARSE(`lead_merged.${field}`)} : (${existingLead}.${field} || '') }}`;
  setNode('Lead Row', pos(27, 0.5), {
    contact_key: [`={{ ${MSG('contact_key')} }}`, 'string'],
    channel: [`={{ ${MSG('channel')} }}`, 'string'],
    contact_id: [`={{ ${MSG('contact_id')} }}`, 'string'],
    name: [personal('name'), 'string'],
    phone: [personal('phone'), 'string'],
    email: [personal('email'), 'string'],
    service_interest: [`={{ ${PARSE('lead_merged.service_interest')} }}`, 'string'],
    consent_at: [`={{ ${existingLead}.consent_at || (${PARSE('consent_given')} ? ${NOW_LOCAL} : '') }}`, 'string'],
    last_intent: [`={{ ${PARSE('ai.intent')} }}`, 'string'],
    status: [`={{ ${FIN('status')} }}`, 'string'],
    handoff_at: [`={{ ${FIN('status')} === 'human' ? ${NOW_LOCAL} : (${existingLead}.handoff_at || '') }}`, 'string'],
    handoff_reason: [`={{ ${FIN('status')} === 'human' ? ${PARSE('guard')}.join(' | ') : '' }}`, 'string'],
    booking_datetime: [`={{ ${FIN('booking_datetime')} || (${existingLead}.booking_datetime || '') }}`, 'string'],
    calendar_event_link: [`={{ ${FIN('calendar_event_link')} || (${existingLead}.calendar_event_link || '') }}`, 'string'],
    last_message: [`={{ ${MSG('text')} }}`, 'string'],
    last_message_at: [`={{ ${NOW_LOCAL} }}`, 'string'],
    first_seen_at: [`={{ ${existingLead}.first_seen_at || ${NOW_LOCAL} }}`, 'string'],
  });
  node('Upsert Lead', 'n8n-nodes-base.googleSheets', 4.7, pos(28, 0.5), {
    authentication: 'oAuth2', resource: 'sheet', operation: 'appendOrUpdate',
    documentId: sheetDoc(), sheetName: sheetTab('Leads'),
    columns: { mappingMode: 'autoMapInputData', value: null, matchingColumns: ['contact_key'], schema: [] },
    options: {},
  }, { executeOnce: true, ...googleRetry });
  setNode('Conversation Log Row', pos(29, 0.5), {
    timestamp: [`={{ ${NOW_LOCAL} }}`, 'string'],
    contact_key: [`={{ ${MSG('contact_key')} }}`, 'string'],
    channel: [`={{ ${MSG('channel')} }}`, 'string'],
    customer_name: [`={{ ${PARSE('lead_merged.name')} }}`, 'string'],
    customer_message: [`={{ ${MSG('text')} }}`, 'string'],
    bot_reply: [`={{ ${FIN('reply_text')} }}`, 'string'],
    intent: [`={{ ${PARSE('ai.intent')} }}`, 'string'],
    confidence: [`={{ ${PARSE('ai.confidence')} }}`, 'number'],
    decision: [`={{ ${FIN('decision')} }}`, 'string'],
    guardrails: [`={{ ${PARSE('guard')}.join(' | ') }}`, 'string'],
    kb_refs: [`={{ ${PARSE('ai.kb_refs')}.join(' ') }}`, 'string'],
    message_id: [`={{ ${MSG('message_id')} }}`, 'string'],
    tokens_used: [`={{ ${PARSE('tokens_used')} }}`, 'number'],
  });
  sheetsAppend('Append Conversation Log', pos(30, 0.5), 'Conversations');
  ifNode('Owner Alert Needed?', pos(31, 0.5), [isTrue(`={{ ${FIN('decision')} === 'handoff' || ${FIN('booking_confirmed')} === true }}`)]);
  gmail('Notify Owner', pos(32, 0.5),
    `={{ ${FIN('decision')} === 'handoff' ? '🙋 A customer needs you' : '📅 New appointment booked' }} – {{ ${CFG('client_name')} }}`,
    [
      `=Hi {{ ${CFG('owner_name')} }},`,
      '',
      `{{ ${FIN('decision')} === 'handoff' ? 'The assistant handed this conversation to you. It stays silent for this customer until you set status = bot in the Leads sheet (or automatically after ' + ${CFG('human_mode_timeout_hours')} + ' hours).' : 'The assistant booked an appointment and added it to Google Calendar.' }}`,
      '',
      `Customer: {{ ${PARSE('lead_merged.name')} || 'unknown' }}`,
      `Channel: {{ ${MSG('channel')} }} ({{ ${MSG('contact_id')} }})`,
      `Phone: {{ ${PARSE('lead_merged.phone')} || '-' }}`,
      `Service interest: {{ ${PARSE('lead_merged.service_interest')} || '-' }}`,
      '',
      'Last message from the customer:',
      `"{{ ${MSG('text')} }}"`,
      '',
      'Assistant replied:',
      `"{{ ${FIN('reply_text')} }}"`,
      '',
      `{{ ${FIN('decision')} === 'handoff' ? 'Why: ' + ${PARSE('guard')}.join(' | ') : 'Appointment: ' + DateTime.fromISO(${FIN('booking_datetime')}).setZone(${CFG('timezone')}).toFormat('cccc d LLLL yyyy, h:mm a') + '\\nCalendar event: ' + ${FIN('calendar_event_link')} }}`,
      '',
      `Leads sheet: https://docs.google.com/spreadsheets/d/{{ ${CFG('google_sheet_id')} }}`,
    ].join('\n'));

  connect('Send WhatsApp Reply', 'Lead Row');
  connect('Send Instagram Reply', 'Lead Row');
  connect('Lead Row', 'Upsert Lead');
  connect('Upsert Lead', 'Conversation Log Row');
  connect('Conversation Log Row', 'Append Conversation Log');
  connect('Append Conversation Log', 'Owner Alert Needed?');
  connect('Owner Alert Needed?', 'Notify Owner', 0);

  // ================================================================ STICKY NOTES
  const NOTE_Y = -640, NOTE_H = 460;
  const noteX = (col) => Math.round(col * X) - 40;
  const noteW = (fromCol, toCol) => (toCol - fromCol + 1) * X;
  sticky('Note · 1 Inbound', `## 1 · Inbound channels
**WhatsApp** → the WhatsApp Trigger node (Meta app Client ID + Secret; it registers the webhook and checks Meta's signature for you).

**Instagram (Meta API)** → two Webhook nodes on the same path \`instagram-inbound\`:
- GET = Meta's one-time verification handshake (edit the verify token in *Verify Token OK?*)
- POST = incoming DMs, answered with 200 at once. **Verify Instagram Signature** (Crypto node, credential = Meta App Secret) recomputes \`X-Hub-Signature-256\` over the raw body; forged requests are dropped.

**Instagram (ManyChat)** → \`manychat-inbound\` webhook protected by a Header Auth credential (ManyChat sends the same header). Use one of the two Instagram options, not both.

**Normalize Message** converts every payload (WhatsApp, Instagram, ManyChat) into one shape: \`channel, contact_id, contact_key, contact_name, text, message_id\`. Status receipts, echoes and empty events produce no item → the run ends quietly.`, [noteX(0), NOTE_Y], noteW(0, 3), NOTE_H, 5);

  sticky('Note · 2 Context', `## 2 · Context (one place to configure a client)
**Client Config** holds everything client-specific: name, timezone, hours, Sheet / Calendar / WhatsApp / Instagram IDs, model, \`reply_mode\` (assistant | strict), \`require_consent\`, thresholds and the hand-off message. Duplicate the workflow per client and edit only this node.

Three Google Sheets reads (all "execute once", "always output data"):
- **Knowledge** tab → the approved price list, services, hours, FAQs (each row gets an id like [S1])
- **Leads** tab → is this customer already known? is a human handling them?
- **Conversations** tab → the last turns, for memory

**Assemble Context** formats the knowledge base, rebuilds the chat history and decides the **Triage**:
- \`bot\` → the assistant answers
- \`human\` → a person took over (status = human in Leads) → log + alert owner, send nothing
- \`ignore\` → Meta re-delivered a message we already logged`, [noteX(4), NOTE_Y], noteW(4, 9), NOTE_H, 4);

  sticky('Note · 3 AI', `## 3 · AI brain + guardrails
**Build Claude Request** writes the system prompt: strict rules + the knowledge base (cached) + today's date, hours and customer profile. The model must answer as strict JSON (\`output_config.format\`) and cite the knowledge base ids it used (\`kb_refs\`).

**Ask Claude** = one HTTP call to the Anthropic Messages API (credential: *Anthropic account*). On API errors it continues so the customer still gets a safe hand-off reply.

**Parse Claude Response** applies checks the model cannot bypass: unreadable/refused output, empty reply, model asked for a human, confidence below threshold, **price guard** (every amount in the reply must exist in the knowledge base), customer asked for a person. In **strict mode** FAQ replies are replaced by the cited sheet rows word for word. Any failure → \`handoff\`.

**Route Decision**: \`answer\` · \`book\` · \`handoff\`.`, [noteX(10), NOTE_Y], noteW(10, 13), NOTE_H, 6);

  sticky('Note · 4 Actions', `## 4 · Actions
- **answer** → send the model's reply as-is.
- **book** → the model only *proposed* a slot. **Validate Booking Slot** checks future / open day / booking hours → **Check Calendar Availability** (free/busy) → **Create Calendar Event** → **List Events In Slot** + **Resolve Booking Race**: if another event was created a moment earlier in the same slot, **Delete Our Event** and tell the customer the slot is gone. Only a race-free event gets the confirmation, written by the workflow, not the model.
- **handoff** → fixed, safe hand-off message; the Leads row is switched to \`status = human\` and the owner is emailed (section 6).

Every branch ends in a Set node with the same fields: \`reply_text, decision, status, booking_confirmed, booking_datetime, calendar_event_link\`.`, [noteX(14), NOTE_Y], noteW(14, 23), NOTE_H, 3);

  sticky('Note · 5 Send', `## 5 · Send the reply
**Finalize Reply** is the single merge point: strips markdown, applies channel formatting (Instagram has no bold), caps length, falls back to the hand-off message if the text is empty.

**Route by Channel** → WhatsApp Business Cloud node or Instagram Send API (HTTP, header credential \`Authorization: Bearer <page token>\`).`, [noteX(24), NOTE_Y], noteW(24, 26), NOTE_H, 7);

  sticky('Note · 6 Log', `## 6 · Lead capture · memory · owner alerts
- **Upsert Lead** → one row per customer in *Leads* (matched on \`contact_key\`): name, phone, email, service interest, consent, status (bot/human), booking, last message. With \`require_consent = true\` the personal fields are written only after the customer says yes.
- **Append Conversation Log** → one row per turn in *Conversations* (customer message, bot reply, intent, confidence, guardrail notes, kb_refs, tokens). This is also the bot's memory.
- **Owner Alert Needed?** → Gmail to the owner on every hand-off and every confirmed booking, with what to do next.

To hand a chat back to the bot: set \`status = bot\` in the Leads sheet (auto-resumes after \`human_mode_timeout_hours\`). Workflow settings → *Error workflow* = "AI Chatbot – Error Alert" so failed runs email the owner too.`, [noteX(27), NOTE_Y], noteW(27, 32), NOTE_H, 4);

  // ================================================================ PIN DATA (sample WhatsApp message for "Test workflow")
  const pinData = {
    'WhatsApp Trigger': [{ json: {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: '15550000000', phone_number_id: 'PASTE_WHATSAPP_PHONE_NUMBER_ID' },
      contacts: [{ profile: { name: 'Ayesha Khan' }, wa_id: '923001234567' }],
      messages: [{ from: '923001234567', id: 'wamid.TEST0001', timestamp: '1760000000', type: 'text', text: { body: 'Hi! How much is teeth cleaning and when are you open?' } }],
      field: 'messages',
    } }],
  };

  return {
    name: 'AI Chatbot – WhatsApp + Instagram (FAQ · Leads · Booking · Hand-off)',
    nodes: g.nodes,
    connections: g.connections,
    pinData,
    settings: { executionOrder: 'v1', saveManualExecutions: true, saveExecutionProgress: true, timezone: 'Asia/Karachi' },
    staticData: null,
    meta: { templateCredsSetupCompleted: false },
    tags: [],
  };
}

// ============================================================================
// ERROR-ALERT WORKFLOW (set as "Error workflow" in the main workflow's settings)
// ============================================================================
function buildErrorAlert() {
  const g = makeGraph();
  const { node, connect, sticky } = g;
  node('Error Trigger', 'n8n-nodes-base.errorTrigger', 1, pos(0, 0), {});
  node('Alert Settings', 'n8n-nodes-base.set', 3.4, pos(1, 0), assign({
    owner_email: ['owner@example.com', 'string'],
    client_name: ['Bright Smile Dental Clinic', 'string'],
  }));
  node('Email Owner About Failure', 'n8n-nodes-base.gmail', 2.2, pos(2, 0), {
    authentication: 'oAuth2', resource: 'message', operation: 'send',
    sendTo: '={{ $json.owner_email }}',
    subject: "=⚠️ Chatbot run failed – {{ $json.client_name }} ({{ $('Error Trigger').first().json.workflow.name }})",
    emailType: 'text',
    message: [
      '=A chatbot run failed and the customer may not have received a reply.',
      '',
      "Workflow: {{ $('Error Trigger').first().json.workflow.name }}",
      "Failed node: {{ $('Error Trigger').first().json.execution.lastNodeExecuted }}",
      "Error: {{ $('Error Trigger').first().json.execution.error.message }}",
      "Execution: {{ $('Error Trigger').first().json.execution.url }}",
      '',
      'What to do: open the execution link, check the failed node (usually an expired Google/Meta token or a renamed sheet tab), fix it, then use "Retry" on the execution so the customer gets their reply.',
    ].join('\n'),
    options: { appendAttribution: false },
  });
  connect('Error Trigger', 'Alert Settings');
  connect('Alert Settings', 'Email Owner About Failure');
  sticky('Note · Error alert', `## Error alert
Import this workflow, pick the Gmail credential, set the owner e-mail in **Alert Settings**, then open the main chatbot workflow → Settings → **Error workflow** → choose this one. Any failed run (expired token, renamed sheet tab, API outage) e-mails the owner with a link to retry it.`, [-40, -300], 820, 220, 3);
  return {
    name: 'AI Chatbot – Error Alert',
    nodes: g.nodes,
    connections: g.connections,
    pinData: {},
    settings: { executionOrder: 'v1' },
    staticData: null,
    meta: { templateCredsSetupCompleted: false },
    tags: [],
  };
}

// ----------------------------------------------------------------- validate + write
function validate(workflow, triggers) {
  const { nodes, connections } = workflow;
  const names = new Set(nodes.map((n) => n.name));
  const incoming = new Set();
  for (const [from, c] of Object.entries(connections)) {
    if (!names.has(from)) throw new Error('connection from unknown node ' + from);
    for (const out of c.main) for (const t of out) { if (!names.has(t.node)) throw new Error(`connection to unknown node ${t.node} (from ${from})`); incoming.add(t.node); }
  }
  for (const n of nodes) {
    if (n.type === 'n8n-nodes-base.stickyNote' || triggers.has(n.name)) continue;
    if (!incoming.has(n.name)) throw new Error('node has no incoming connection: ' + n.name);
  }
  for (const n of nodes.filter((n) => n.type === 'n8n-nodes-base.switch')) {
    const outputs = n.parameters.rules.values.length;
    if ((connections[n.name].main || []).length !== outputs) throw new Error(`switch ${n.name} has ${outputs} outputs but ${connections[n.name].main.length} wired`);
  }
  for (const n of nodes.filter((n) => n.type === 'n8n-nodes-base.if')) {
    if (!connections[n.name] || connections[n.name].main.filter((o) => o.length).length < 1) throw new Error('IF without outputs ' + n.name);
  }
  for (const n of nodes.filter((n) => n.type === 'n8n-nodes-base.code')) new Function('$input', '$', 'DateTime', n.parameters.jsCode);
  // every $('Node') reference must point at an existing node
  const refRe = /\$\('([^']+)'\)/g;
  const scan = (v) => { if (typeof v === 'string') { let m; while ((m = refRe.exec(v))) if (!names.has(m[1])) throw new Error(`reference to unknown node "${m[1]}"`); } else if (v && typeof v === 'object') Object.values(v).forEach(scan); };
  nodes.forEach((n) => scan(n.parameters));
}

const main = buildMain();
validate(main, new Set(['WhatsApp Trigger', 'ManyChat Inbound (POST)', 'Instagram Inbound (POST)', 'Instagram Verify (GET)']));
const err = buildErrorAlert();
validate(err, new Set(['Error Trigger']));

if (require.main === module) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(main, null, 2) + '\n');
  fs.writeFileSync(OUT_ERR, JSON.stringify(err, null, 2) + '\n');
  const count = (w) => `${w.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote').length} nodes, ${w.nodes.filter((n) => n.type === 'n8n-nodes-base.stickyNote').length} notes, ${Object.values(w.connections).reduce((a, c) => a + c.main.reduce((b, o) => b + o.length, 0), 0)} connections`;
  console.log(`wrote ${OUT}: ${count(main)}`);
  console.log(`wrote ${OUT_ERR}: ${count(err)}`);
}
module.exports = { LEAD_COLUMNS, LOG_COLUMNS };
