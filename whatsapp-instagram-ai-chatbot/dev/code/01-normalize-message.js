// ============================================================================
// 1 · NORMALIZE MESSAGE
// ----------------------------------------------------------------------------
// Turns ANY inbound payload into ONE canonical shape, so every node after this
// one is channel-agnostic. Accepted inputs:
//   • WhatsApp Trigger node output          (flattened Meta "value" object)
//   • Raw Meta webhook body                  (WhatsApp or Instagram "entry" array)
//   • Generic Webhook node output            ({ headers, query, body })
//   • ManyChat "External Request"            ({ channel, contact_id, text, ... })
//
// Output item (exactly one, or none):
//   channel       "whatsapp" | "instagram"
//   contact_id    phone number (WhatsApp) or Instagram-scoped user id (IGSID)
//   contact_key   "<channel>:<contact_id>"  → the key used in the Google Sheets
//   contact_name  profile name when the channel sends one, else ""
//   text          the customer's message (quick successive messages are joined)
//   message_id    platform message id (used to ignore duplicate deliveries)
//   message_type  "text" | "image" | "audio" | "video" | "document" | ...
//   received_at   ISO timestamp
//
// Delivery/read receipts, echoes of our own replies and empty payloads produce
// NO item, which simply ends the execution (nothing to answer).
// ============================================================================

const bySender = {};

function add(m) {
  if (!m.contact_id || !m.text) return;
  const key = `${m.channel}:${m.contact_id}`;
  if (!bySender[key]) {
    bySender[key] = {
      channel: m.channel,
      contact_id: String(m.contact_id),
      contact_key: key,
      contact_name: m.contact_name || '',
      text: m.text,
      message_id: String(m.message_id || `${key}:${m.ts}`),
      message_type: m.message_type || 'text',
      received_at: new Date(m.ts || Date.now()).toISOString(),
    };
  } else {
    // The customer sent several messages in one burst → treat as one turn.
    bySender[key].text += '\n' + m.text;
  }
}

function placeholder(type) {
  return `[The customer sent a ${type} message that the assistant cannot read]`;
}

// WhatsApp Cloud API: one "value" object = { metadata, contacts[], messages[] | statuses[] }
function handleWhatsAppValue(v) {
  const names = {};
  for (const c of v.contacts || []) names[c.wa_id] = (c.profile && c.profile.name) || '';
  for (const m of v.messages || []) {          // "statuses" payloads have no messages → ignored
    let text = '';
    if (m.type === 'text') text = (m.text && m.text.body) || '';
    else if (m.type === 'button') text = (m.button && m.button.text) || '';
    else if (m.type === 'interactive') {
      const i = m.interactive || {};
      text = (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || '';
    } else text = placeholder(m.type || 'unsupported');
    add({
      channel: 'whatsapp',
      contact_id: m.from,
      contact_name: names[m.from] || '',
      text: String(text).trim(),
      message_id: m.id,
      message_type: m.type || 'text',
      ts: m.timestamp ? Number(m.timestamp) * 1000 : Date.now(),
    });
  }
}

// Instagram Messaging API: one "messaging" event = { sender, recipient, timestamp, message }
function handleInstagramEvent(ev) {
  const msg = ev.message;
  if (!msg || msg.is_echo || msg.is_deleted) return;   // is_echo = our own outgoing message → never answer it
  let text = msg.text || '';
  let type = 'text';
  if (!text && msg.quick_reply && msg.quick_reply.payload) text = String(msg.quick_reply.payload);
  if (!text && Array.isArray(msg.attachments) && msg.attachments.length) {
    type = msg.attachments[0].type || 'attachment';
    text = placeholder(type);
  }
  add({
    channel: 'instagram',
    contact_id: ev.sender && ev.sender.id,
    contact_name: '',
    text: String(text).trim(),
    message_id: msg.mid,
    message_type: type,
    ts: ev.timestamp || Date.now(),
  });
}

for (const item of $input.all()) {
  let p = item.json || {};
  if (p.body && typeof p.body === 'object' && !p.messages && !p.entry) p = p.body;   // generic Webhook node → unwrap

  if (Array.isArray(p.messages) || Array.isArray(p.statuses) || p.messaging_product === 'whatsapp') {
    handleWhatsAppValue(p);                                   // WhatsApp Trigger node output
  } else if (Array.isArray(p.entry)) {                        // raw Meta webhook body
    for (const entry of p.entry) {
      for (const change of entry.changes || []) if (change.value) handleWhatsAppValue(change.value);
      for (const ev of entry.messaging || []) handleInstagramEvent(ev);
    }
  } else if (p.contact_id && p.text) {                        // ManyChat External Request (simple JSON)
    add({
      channel: p.channel === 'whatsapp' ? 'whatsapp' : 'instagram',
      contact_id: p.contact_id,
      contact_name: p.contact_name || '',
      text: String(p.text).trim(),
      message_id: p.message_id,
      message_type: 'text',
      ts: Date.now(),
    });
  }
}

// Meta sends one notification per sender, so the workflow handles ONE
// conversation per execution. (In the rare case a batch contains several
// senders only the first is processed — see README → Known limits.)
return Object.values(bySender).slice(0, 1).map((json) => ({ json }));
