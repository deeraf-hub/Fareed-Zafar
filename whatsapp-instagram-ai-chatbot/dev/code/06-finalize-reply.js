// ============================================================================
// 6 · FINALIZE REPLY
// ----------------------------------------------------------------------------
// Single merge point for every branch (answer / booking / handoff). Produces the
// exact item the "send" nodes and the logging nodes read:
//   channel, contact_id, contact_key, reply_text, decision, status,
//   booking_confirmed, booking_datetime, calendar_event_link
// Also applies last-mile formatting rules per channel.
// ============================================================================

const r = $input.first().json;
const message = $('Normalize Message').first().json;
const config = $('Client Config').first().json;

let text = String(r.reply_text || '')
  .replace(/^#{1,6}\s+/gm, '')      // markdown headings → plain
  .replace(/\*\*(.+?)\*\*/g, '*$1*') // **bold** → *bold* (WhatsApp style)
  .replace(/`/g, '')
  .trim();

if (message.channel === 'instagram') text = text.replace(/\*/g, '');   // Instagram has no text formatting
if (text.length > 1000) text = text.slice(0, 997) + '...';             // keep chat replies short
if (!text) text = String(config.handoff_message || 'Thanks for your message! Our team will get back to you shortly.');

return [{
  json: {
    channel: message.channel,
    contact_id: message.contact_id,
    contact_key: message.contact_key,
    reply_text: text,
    decision: r.decision || 'answer',
    status: r.status || 'bot',
    booking_confirmed: Boolean(r.booking_confirmed),
    booking_datetime: r.booking_datetime || '',
    calendar_event_link: r.calendar_event_link || '',
  },
}];
