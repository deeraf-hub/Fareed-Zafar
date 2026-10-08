// Preview smoke tests: start the preview server on a random port and drive the
// walkthrough scenarios over HTTP. Every assertion is about the REAL workflow
// logic (Code nodes + n8n expressions); providers are the local simulators.
const assert = require('assert');
const { server } = require('./preview-server');

let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('  ✓', name); };

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = (session, action, body) => fetch(`${base}/api/session/${session}/${action}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}).then((r) => r.json());
  const say = (session, msg) => api(session, 'message', msg);
  const S = 'smoke-' + Date.now();
  try {
    console.log('\nPreview smoke tests');
    await test('health + static pages are served', async () => {
      const h = await fetch(`${base}/api/health`).then((r) => r.json());
      assert.strictEqual(h.ok, true);
      for (const p of ['/', '/walkthrough', '/preview.css', '/preview.js', '/walkthrough.js']) {
        const r = await fetch(base + p); assert.strictEqual(r.status, 200, p);
        if (p === '/walkthrough') assert.match(await r.text(), /Local demo — external services simulated\./);
      }
    });
    await test('FAQ: answer cites the knowledge row, no guardrail triggered, lead captured', async () => {
      const r = await say(S, { channel: 'whatsapp', contact_id: '923001234567', contact_name: 'Ayesha Khan', text: 'Hi! How much is teeth cleaning?' });
      assert.strictEqual(r.ok, true); assert.strictEqual(r.decision, 'answer'); assert.deepStrictEqual(r.kb_refs, ['S1']); assert.deepStrictEqual(r.guardrails, []);
      assert.match(r.reply, /PKR 3,500/); assert.strictEqual(r.lead.name, 'Ayesha Khan'); assert.strictEqual(r.lead.status, 'bot');
      assert.ok(r.nodes_run.includes('Parse Claude Response') && r.nodes_run.includes('Upsert Lead'));
    });
    await test('complete booking sequence: name → service → day/time → confirmation → event + lead + owner email', async () => {
      const ig = { channel: 'instagram', contact_id: '1234567890123456' };
      const steps = ['Hi, I want to book an appointment', 'Sara Malik', 'Teeth cleaning please', 'Tuesday at 3 pm'];
      const replies = [];
      for (const text of steps) { const r = await say(S, { ...ig, text }); assert.strictEqual(r.decision, 'answer', text); replies.push(r.reply); }
      assert.match(replies[0], /name/i); assert.match(replies[1], /service/i); assert.match(replies[2], /day and time/i); assert.match(replies[3], /To confirm: Teeth Cleaning/);
      const before = (await api(S, 'state')).calendar.length;
      const r = await say(S, { ...ig, text: 'Yes' });
      assert.strictEqual(r.decision, 'book'); assert.strictEqual(r.slot.valid, true); assert.match(r.slot.start_iso, /T15:00:00/);
      assert.match(r.reply, /Your appointment is confirmed/); assert.match(r.reply, /Sara Malik/);
      const st = await api(S, 'state');
      assert.strictEqual(st.calendar.length, before + 1); assert.match(st.calendar.at(-1).summary, /Teeth Cleaning.*Sara Malik/);
      const lead = st.leads.find((l) => l.contact_key === 'instagram:1234567890123456');
      assert.strictEqual(lead.booking_datetime, r.slot.start_iso); assert.ok(st.emails.some((e) => /appointment booked/.test(e.subject)));
      for (const n of ['Validate Booking Slot', 'Check Calendar Availability', 'Create Calendar Event', 'Resolve Booking Race', 'Booking Confirmed Reply', 'Notify Owner']) assert.ok(r.nodes_run.includes(n), n);
    });
    await test('slot already taken → deterministic "already booked" reply, no second event', async () => {
      const ig = { channel: 'instagram', contact_id: '2222222222222222' };
      for (const text of ['book please', 'Omar Farooq', 'teeth cleaning', 'Tuesday at 3 pm']) await say(S, { ...ig, text });
      const before = (await api(S, 'state')).calendar.length;
      const r = await say(S, { ...ig, text: 'yes' });
      assert.strictEqual(r.decision, 'answer'); assert.match(r.reply, /already booked/);
      assert.strictEqual((await api(S, 'state')).calendar.length, before);
      assert.ok(r.nodes_run.includes('Slot Taken Reply') && !r.nodes_run.includes('Create Calendar Event'));
    });
    await test('duplicate delivery (same message id) is ignored: no reply, no extra rows', async () => {
      const msg = { channel: 'whatsapp', contact_id: '923005550000', contact_name: 'Bilal', text: 'Where are you located?', message_id: 'wamid.SMOKE.DUP' };
      const first = await say(S, msg); assert.strictEqual(first.decision, 'answer');
      const rows = (await api(S, 'state')).conversations.length;
      const second = await say(S, msg);
      assert.strictEqual(second.triage, 'ignore'); assert.strictEqual(second.reply, null); assert.ok(second.nodes_run.includes('Ignore Duplicate'));
      assert.strictEqual((await api(S, 'state')).conversations.length, rows);
    });
    await test('unsupported question → hand-off, lead = human, owner alerted; next message gets no bot reply', async () => {
      const wa = { channel: 'whatsapp', contact_id: '923001234567', contact_name: 'Ayesha Khan' };
      const r = await say(S, { ...wa, text: 'Do you do dental implants? How much?' });
      assert.strictEqual(r.decision, 'handoff'); assert.strictEqual(r.status, 'human'); assert.ok(r.guardrails.some((g) => /not in knowledge base/.test(g)));
      assert.ok(r.new_emails.some((e) => /needs you/.test(e.subject)));
      const paused = await say(S, { ...wa, text: 'Is it painful?' });
      assert.strictEqual(paused.triage, 'human'); assert.strictEqual(paused.reply, null);
      assert.ok(paused.new_emails.some((e) => /handling this chat/.test(e.subject)));
      assert.ok(paused.nodes_run.includes('Notify Owner (Human Mode)') && !paused.nodes_run.includes('Ask Claude'));
      const back = await api(S, 'lead-status', { contact_key: 'whatsapp:923001234567', status: 'bot' });
      assert.strictEqual(back.lead.status, 'bot');
      const again = await say(S, { ...wa, text: 'Are you open on Sunday?' });
      assert.strictEqual(again.decision, 'answer');
    });
    await test('price guard: a misquoted price from the (simulated) model is rejected by the real Parse node', async () => {
      const r = await say(S, { channel: 'whatsapp', contact_id: '923009998877', contact_name: 'Hamza Iqbal', text: 'What does a cleaning cost?', hooks: { invented_price: true } });
      assert.strictEqual(r.decision, 'handoff'); assert.ok(r.guardrails.some((g) => /price_not_in_knowledge_base: PKR 2,750/.test(g)));
      assert.ok(!/2,750/.test(r.reply), 'the invented price must not reach the customer');
    });
    await test('non-text message (image) → asks the customer to type', async () => {
      const r = await say(S, { channel: 'whatsapp', contact_id: '923001111111', contact_name: 'Nida', type: 'image' });
      assert.strictEqual(r.ok, true); assert.ok(r.reply, 'a reply is produced');
    });
    await test('reset isolation: another session is untouched; reset clears only this session', async () => {
      const other = S + '-other';
      await say(other, { channel: 'whatsapp', contact_id: '923000000001', contact_name: 'Other', text: 'How much is whitening?' });
      assert.strictEqual((await api(other, 'state')).leads.length, 1);
      assert.ok((await api(S, 'state')).leads.length >= 4);
      await api(S, 'reset', {});
      assert.strictEqual((await api(S, 'state')).leads.length, 0);
      assert.strictEqual((await api(other, 'state')).leads.length, 1);
    });
    await test('workflow map exposes every non-note node with a section and kind', async () => {
      const w = await fetch(`${base}/api/workflow`).then((r) => r.json());
      assert.strictEqual(w.nodeCount, 49); assert.ok(w.nodes.every((n) => n.section && n.kind)); assert.strictEqual(w.sections.length, 6);
    });
    console.log(`\nAll ${passed} smoke tests passed.`);
  } catch (e) {
    console.error('\nSMOKE TEST FAILED:', e.message); process.exitCode = 1;
  } finally { server.close(); }
})();
