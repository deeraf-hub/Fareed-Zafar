// ============================================================================
// 7 · RESOLVE BOOKING RACE
// ----------------------------------------------------------------------------
// Google Calendar's free/busy check and the event insert are two separate API
// calls. If two customers confirm the same slot within those few seconds, both
// events get created. This node runs AFTER our insert and lists every event in
// the slot: the event that was created FIRST keeps the slot. If ours is not the
// first, the workflow deletes our event and tells the customer the slot is gone.
// Output: { keep: true | false, our_event_id, competing_event_id }
// ============================================================================

const ours = $('Create Calendar Event').first().json;
const events = $input.all().map((i) => i.json).filter((e) => e && e.id);

const overlaps = (e) => {
  const s = (e.start && (e.start.dateTime || e.start.date)) || '';
  const t = (e.end && (e.end.dateTime || e.end.date)) || '';
  const os = ours.start && (ours.start.dateTime || ours.start.date);
  const oe = ours.end && (ours.end.dateTime || ours.end.date);
  if (!s || !t || !os || !oe) return true;              // be conservative: treat unknown as overlapping
  return new Date(s) < new Date(oe) && new Date(t) > new Date(os);
};

const competitors = events.filter((e) => e.id !== ours.id && e.status !== 'cancelled' && overlaps(e));
const earlier = competitors.filter((e) => e.created && ours.created && new Date(e.created) < new Date(ours.created));

const keep = earlier.length === 0;
return [{ json: { keep, our_event_id: ours.id, competing_event_id: keep ? null : earlier[0].id, competitors: competitors.length } }];
