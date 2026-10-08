// ============================================================================
// 5 · VALIDATE BOOKING SLOT
// ----------------------------------------------------------------------------
// The model only proposes a date + time. The WORKFLOW decides whether that slot
// is allowed: in the future, on an open day, inside booking hours. Only a valid
// slot is checked against Google Calendar.
// Output adds: slot { valid, error, error_text, start_iso, end_iso, human }
// ============================================================================

const ctx = $input.first().json;
const config = ctx.config;
const b = ctx.ai.booking;
const zone = config.timezone || 'UTC';
const slotMinutes = Number(config.slot_minutes) || 30;

const start = DateTime.fromISO(`${b.date}T${b.time}`, { zone });
let error = null;

if (!start.isValid) error = 'invalid_datetime';
else {
  const now = DateTime.now().setZone(zone);
  const [oh, om] = String(config.opening_time || '09:00').split(':').map(Number);
  const [ch, cm] = String(config.closing_time || '18:00').split(':').map(Number);
  const closedDays = String(config.closed_days || '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
  const opens = start.set({ hour: oh, minute: om, second: 0, millisecond: 0 });
  const closes = start.set({ hour: ch, minute: cm, second: 0, millisecond: 0 });

  if (start <= now) error = 'in_the_past';
  else if (closedDays.includes(start.weekdayLong.toLowerCase())) error = 'closed_day';
  else if (start < opens || start.plus({ minutes: slotMinutes }) > closes) error = 'outside_hours';
}

const end = start.isValid ? start.plus({ minutes: slotMinutes }) : null;

const ERROR_TEXT = {
  in_the_past: 'That time has already passed.',
  closed_day: "We're closed on that day.",
  outside_hours: 'That time is outside our booking hours.',
  invalid_datetime: "I couldn't understand that date or time.",
};

return [{
  json: {
    ...ctx,
    slot: {
      valid: !error,
      error,
      error_text: error ? ERROR_TEXT[error] : '',
      start_iso: start.isValid ? start.toISO() : null,
      end_iso: end ? end.toISO() : null,
      human: start.isValid ? start.toFormat("cccc d LLLL yyyy 'at' h:mm a") : `${b.date} ${b.time}`,
    },
  },
}];
