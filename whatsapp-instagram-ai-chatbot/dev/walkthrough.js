// Recruiter walkthrough: a scripted, animated tour that drives the local
// preview API. Everything the bot "does" below is the real workflow logic
// running on this machine; providers (WhatsApp, Instagram, Google, email, the
// AI model) are simulated. Fictional customers only.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('rm').textContent = RM ? 'reduced motion: on' : '';
  const session = 'walkthrough-' + Math.random().toString(36).slice(2, 10);
  $('session').textContent = `Isolated walkthrough session · ${session}`;
  const api = (action, body) => fetch(`/api/session/${session}/${action}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}).then((r) => r.json());
  const timeStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // Fictional customers
  const AYESHA = { channel: 'whatsapp', contact_id: '923001234567', contact_name: 'Ayesha Khan', label: 'Ayesha Khan · WhatsApp · +92 300 1234567 (fictional)' };
  const SARA = { channel: 'instagram', contact_id: '1234567890123456', contact_name: '', label: 'Instagram DM · @sara.malik.demo (fictional)' };
  const HAMZA = { channel: 'whatsapp', contact_id: '923009998877', contact_name: 'Hamza Iqbal', label: 'Hamza Iqbal · WhatsApp · +92 300 9998877 (fictional)' };

  class Cancelled extends Error {}

  const player = {
    idx: -1, playing: false, paused: false, token: null, resumeWaiters: [], usedNodes: new Set(), elapsed: 0, sceneStart: 0, tick: null,
  };

  // ------------------------------------------------------------ helpers available to scenes
  function check(token) { if (token.cancelled) throw new Cancelled(); }
  async function wait(token, ms) {
    check(token);
    const end = Date.now() + ms;
    while (Date.now() < end) {
      while (player.paused) { await new Promise((r) => player.resumeWaiters.push(r)); check(token); }
      await new Promise((r) => setTimeout(r, Math.min(60, end - Date.now())));
      check(token);
    }
  }
  function caption(html, note) { $('caption').innerHTML = html + (note ? `<small>${note}</small>` : ''); }
  function show(id, html) {
    const p = $('p-' + id); if (html !== undefined) { const b = $(id + '-body'); if (b) b.innerHTML = html; else p.innerHTML = html; }
    p.classList.remove('hidden');
    // keep the newest card in view inside the story column (desktop only; the phone stays put)
    if (window.innerWidth > 900) setTimeout(() => p.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'nearest' }), 80);
  }
  function hide(id) { $('p-' + id).classList.add('hidden'); }
  function clearPanels() { document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden')); }
  function phone(customer) {
    const ig = customer.channel === 'instagram';
    $('screen').classList.toggle('instagram', ig);
    $('chan-label').textContent = ig ? 'Instagram · direct messages' : 'WhatsApp · business account';
    $('chat').innerHTML = '';
    system(customer.label);
  }
  function system(text) { const el = document.createElement('div'); el.className = 'bubble system'; el.textContent = text; $('chat').appendChild(el); scroll(); }
  function scroll() { $('chat').scrollTop = $('chat').scrollHeight; }
  async function typeInto(token, el, text, speed, asHtml) {
    if (RM) { el[asHtml ? 'innerHTML' : 'value'] = asHtml ? esc(text) : text; return; }
    let out = '';
    for (const ch of text) { out += ch; if (asHtml) el.innerHTML = esc(out) + '<span class="caret"></span>'; else el.value = out; scroll(); await wait(token, speed); }
    if (asHtml) el.innerHTML = esc(out);
  }
  async function customerSays(token, customer, text, hooks) {
    await typeInto(token, $('text'), text, 26);
    await wait(token, 350);
    $('text').value = '';
    const el = document.createElement('div'); el.className = 'bubble out'; el.innerHTML = esc(text) + `<time>${timeStr()}</time>`; $('chat').appendChild(el); scroll();
    const typing = document.createElement('div'); typing.className = 'typing'; typing.innerHTML = '<i></i><i></i><i></i>'; $('chat').appendChild(typing); scroll();
    const r = await api('message', { channel: customer.channel, contact_id: customer.contact_id, contact_name: customer.contact_name, text, hooks: hooks || {} });
    check(token);
    r.nodes_run.forEach((n) => player.usedNodes.add(n));
    await wait(token, 500);
    typing.remove();
    return r;
  }
  async function botSays(token, text) {
    const el = document.createElement('div'); el.className = 'bubble in'; $('chat').appendChild(el); scroll();
    await typeInto(token, el, text, 9, true);
    el.innerHTML += `<time>${timeStr()}</time>`; scroll();
  }
  async function pipeline(token, r, emphasize) {
    show('pipeline');
    $('pipeline-meta').textContent = `${r.nodes_run.length} nodes · ${r.ms} ms`;
    $('pipeline-body').innerHTML = r.trace.map((t) => `<span class="node-chip ${t.kind} dim" title="${esc(t.kindLabel)}\n${esc(t.summary)}">${esc(t.node)}</span>`).join('');
    const chips = [...$('pipeline-body').children];
    for (const c of chips) { c.classList.remove('dim'); c.classList.add('lit'); await wait(token, RM ? 0 : 55); c.classList.remove('lit'); }
    if (emphasize) chips.forEach((c) => { if (emphasize.includes(c.textContent)) c.classList.add('lit'); });
  }
  function verdictHtml(r) {
    const rows = [['Triage', r.triage], ['Intent · confidence', `${r.intent} · ${r.confidence}`], ['Knowledge rows cited', r.kb_refs.length ? r.kb_refs.join(', ') : 'none'], ['Guardrails', r.guardrails.length ? `<span class="pill bad">${r.guardrails.length} triggered</span> ${esc(r.guardrails.join(' · '))}` : '<span class="pill real">none triggered</span>'], ['Decision', `<b>${esc(r.decision)}</b>`], ['Lead status after this turn', r.lead ? esc(r.lead.status) : '—']];
    return `<div class="kv">${rows.map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('')}</div>`;
  }
  function emailHtml(e) { return `<div class="email"><div class="email-h"><b>${esc(e.subject)}</b><br><span class="muted">to ${esc(e.to)} · Gmail node · would be sent in production</span></div><pre>${esc(e.text)}</pre></div>`; }
  function leadHtml(l) { const keys = ['contact_key', 'channel', 'name', 'phone', 'service_interest', 'status', 'booking_datetime', 'handoff_reason', 'last_intent']; return `<div class="kv">${keys.map((k) => `<b>${k}</b><span>${esc(l[k] || '—')}</span>`).join('')}</div>`; }
  let knowledge = null, workflowMap = null;
  async function loadStatic() {
    if (!knowledge) knowledge = (await fetch('/api/knowledge').then((r) => r.json()));
    if (!workflowMap) workflowMap = await fetch('/api/workflow').then((r) => r.json());
  }
  function kbRows(filterCat, litIds, limit) {
    // ids are assigned the same way as the Assemble Context node: category initial + position
    const counters = {}; const all = knowledge.rows.map((r) => { const c = r.category.toLowerCase(); counters[c] = (counters[c] || 0) + 1; return { ...r, id: `${c[0].toUpperCase()}${counters[c]}` }; });
    let rows = all.filter((r) => !filterCat || r.category === filterCat);
    const hidden = limit && rows.length > limit ? rows.length - limit : 0;
    if (limit) { const lit = rows.filter((r) => litIds && litIds.includes(r.id)); const rest = rows.filter((r) => !lit.includes(r)); rows = [...lit, ...rest].slice(0, limit); }
    return rows.map((r) => `<div class="kbrow ${litIds && litIds.includes(r.id) ? 'lit' : ''}"><span class="id">${r.id}</span><div><b>${esc(r.title)}</b><div class="muted">${esc(r.content)}</div></div></div>`).join('<div style="height:6px"></div>') + (hidden ? `<p class="muted" style="margin:8px 0 0">+ ${hidden} more ${filterCat || ''} row${hidden > 1 ? 's' : ''} in the sheet (${all.length} rows in total: services, hours, location, booking, policies, FAQ)</p>` : '');
  }

  // ------------------------------------------------------------ scenes
  const scenes = [
    { title: 'Introduction', est: 16, async run(t) {
      phone({ ...AYESHA, label: 'Customer messages arrive here' });
      caption('A small clinic gets the same questions all day on WhatsApp and Instagram: <b>prices, opening hours, "can I come tomorrow at 3?"</b>. Staff answer late between patients, and leads slip away.');
      show('intro', `<div class="intro-cards"><div class="intro-card"><b>💬 WhatsApp</b>WhatsApp Cloud API, native n8n trigger</div><div class="intro-card"><b>📸 Instagram</b>Meta Messaging API or ManyChat</div><div class="intro-card"><b>📄 Google Sheets</b>Knowledge base · leads · conversation log</div><div class="intro-card"><b>📅 Google Calendar</b>Free/busy check and booking</div><div class="intro-card"><b>🙋 Human hand-off</b>Pause the bot, email the owner</div></div>`);
      await wait(t, 5500);
      caption('This walkthrough runs the <b>real n8n workflow logic</b> on this machine: the actual Code nodes and node expressions from the workflow file.', 'WhatsApp, Instagram, Google Sheets, Google Calendar, email and the AI model are simulated locally. Nothing leaves this computer and no real account is contacted.');
      await wait(t, 6000);
      caption('Seven short scenes, about three minutes. Pause, go back or skip ahead at any time.');
      await wait(t, 3500);
    } },

    { title: 'Approved FAQ', est: 30, async run(t) {
      await api('reset', {});
      phone(AYESHA);
      caption('<b>Scene 2 · Approved FAQ.</b> Ayesha, a fictional customer, asks about prices on WhatsApp.');
      await wait(t, 1800);
      const r = await customerSays(t, AYESHA, 'Hi! How much is teeth cleaning?', { reset_draft: true });
      await loadStatic();
      show('kb', kbRows('services', r.kb_refs, 3));
      caption('The assistant may only answer from the clinic\'s own sheet. The highlighted row is the one it cited.', 'The whole sheet is injected into the prompt on every message, with an id per row, so the owner can change a price and the bot follows instantly.');
      await wait(t, 2600);
      await botSays(t, r.reply);
      await pipeline(t, r, ['Parse Claude Response']);
      show('verdict', verdictHtml(r));
      caption('Before anything is sent, the <b>Parse Claude Response</b> node checks the answer: every price in it must exist in the sheet (PKR 3,500 does) and confidence must clear the threshold. Only then is the reply sent and the lead row written.', 'Green chips are real Code nodes executed as-is; blue chips are the workflow\'s own n8n expressions; amber chips are the simulated providers.');
      await wait(t, 7000);
    } },

    { title: 'Appointment booking', est: 62, async run(t) {
      await api('reset', {});
      phone(SARA);
      caption('<b>Scene 3 · Booking.</b> Sara messages on Instagram. The assistant collects four things in order: name, service, day and time, then asks for an explicit confirmation.', 'Instagram messages enter through the Meta webhook path; its signature check is simulated here.');
      await wait(t, 2200);
      let r = await customerSays(t, SARA, 'Hi, I want to book an appointment', { reset_draft: true });
      await botSays(t, r.reply);
      await wait(t, 900);
      r = await customerSays(t, SARA, 'Sara Malik');
      await botSays(t, r.reply);
      await wait(t, 900);
      r = await customerSays(t, SARA, 'Teeth cleaning please');
      await botSays(t, r.reply);
      await wait(t, 900);
      r = await customerSays(t, SARA, 'Tuesday at 3 pm');
      await botSays(t, r.reply);
      caption('Nothing is booked yet. The model only collects details and must get a clear <b>yes</b> before the workflow does anything with the calendar.');
      await wait(t, 3200);
      r = await customerSays(t, SARA, 'Yes');
      const s = r.slot;
      show('slot', `<div class="kv"><b>Proposed by the model</b><span>${esc(r.booking.service)} · ${esc(r.booking.date)} ${esc(r.booking.time)}</span><b>Future, open day, inside hours?</b><span>${s.valid ? '<span class="pill real">valid</span>' : `<span class="pill bad">${esc(s.error)}</span>`}</span><b>Slot</b><span>${esc(s.human)} · ${esc(s.start_iso)} → ${esc(s.end_iso)}</span><b>Slot length</b><span>30 minutes, from <code>slot_minutes</code> in Client Config (the same for every service in this configuration)</span><b>Calendar free/busy</b><span><span class="pill simulated">simulated</span> free</span></div>`);
      caption('The workflow, not the model, validates the slot: in the future, on an open day, inside booking hours. Then it asks the calendar whether the slot is free.');
      await wait(t, 4200);
      const ev = r.new_events[0];
      if (ev) show('calendar', `<div class="kv"><b>Summary</b><span>${esc(ev.summary)}</span><b>Start → end</b><span>${esc(ev.start.dateTime)} → ${esc(ev.end.dateTime)}</span><b>Description</b><span><pre>${esc(ev.description)}</pre></span><b>Record</b><span>in-memory demo calendar · id ${esc(ev.id)}</span></div>`);
      await pipeline(t, r, ['Validate Booking Slot', 'Check Calendar Availability', 'Create Calendar Event', 'Resolve Booking Race', 'Booking Confirmed Reply']);
      caption('Event created. <b>Resolve Booking Race</b> then lists the slot again: if another event had been created a moment earlier, ours would be deleted and Sara asked for another time.');
      await wait(t, 3800);
      await botSays(t, r.reply);
      if (r.lead) show('lead', leadHtml(r.lead));
      const mail = r.new_emails.find((e) => /booked/.test(e.subject)); if (mail) show('email', emailHtml(mail));
      caption('The confirmation text is written by the workflow after the (simulated) calendar insert succeeds. The lead row gets the booking, and the owner is emailed.', 'In production the same nodes talk to the real Google Calendar, Google Sheets and Gmail.');
      await wait(t, 6500);
    } },

    { title: 'Human hand-off', est: 34, async run(t) {
      await api('reset', {});
      phone(AYESHA);
      caption('<b>Scene 4 · Human hand-off.</b> Ayesha asks about something the clinic never approved for the bot.');
      await wait(t, 1800);
      const r = await customerSays(t, AYESHA, 'Do you do dental implants? How much?', { reset_draft: true });
      show('verdict', verdictHtml(r));
      caption('Implants are not in the sheet. The model says so with low confidence, and the real guardrails route the turn to <b>hand-off</b>: a fixed safe reply, nothing invented.');
      await wait(t, 3000);
      await botSays(t, r.reply);
      const mail = r.new_emails.find((e) => /needs you/.test(e.subject)); if (mail) show('email', emailHtml(mail));
      if (r.lead) show('lead', leadHtml(r.lead));
      await pipeline(t, r, ['Handoff Reply', 'Notify Owner']);
      caption('The lead is marked <b>status = human</b> and the owner gets an email with the conversation and what to do next.');
      await wait(t, 4200);
      const r2 = await customerSays(t, AYESHA, 'Is it painful?');
      system('No automatic reply: a person is handling this chat.');
      const mail2 = r2.new_emails[0]; if (mail2) show('email', emailHtml(mail2));
      await pipeline(t, r2, ['Triage', 'Notify Owner (Human Mode)']);
      caption('While a human owns the chat the bot stays <b>silent</b>: the message is logged and forwarded to the owner, and the model is never called. Setting the row back to <code>bot</code>, or the 12-hour timeout, resumes the assistant.');
      await wait(t, 6000);
    } },

    { title: 'Wrong-answer safeguard', est: 28, async run(t) {
      await api('reset', {});
      phone(HAMZA);
      caption('<b>Scene 5 · Wrong-answer safeguard.</b> A test hook forces the simulated model to misquote a price. What matters is what the real <b>Parse Claude Response</b> node does next.', 'Test hook: the local responder is instructed to answer with a wrong number. A real model can make the same mistake.');
      await wait(t, 3200);
      const r = await customerSays(t, HAMZA, 'What does a cleaning cost?', { invented_price: true, reset_draft: true });
      const sim = r.trace.find((x) => x.node === 'Ask Claude');
      const aiOut = sim && sim.data && sim.data.response_json;
      show('model', `<p class="muted" style="margin:0 0 8px">What the model returned (JSON the workflow asked for):</p><pre>${esc(JSON.stringify(aiOut ? { intent: aiOut.intent, reply: aiOut.reply, confidence: aiOut.confidence, kb_refs: aiOut.kb_refs } : {}, null, 2))}</pre>`);
      caption('The model answered confidently with <b>PKR 2,750</b>. That number does not exist anywhere in the approved sheet.');
      await wait(t, 3800);
      show('verdict', verdictHtml(r));
      await pipeline(t, r, ['Parse Claude Response', 'Handoff Reply']);
      caption('The price guard blocks it: the guardrail line reads <code>price_not_in_knowledge_base: PKR 2,750</code>, the decision becomes hand-off, and the customer gets the safe reply instead. The owner is alerted.');
      await wait(t, 2500);
      await botSays(t, r.reply);
      const mail = r.new_emails[0]; if (mail) show('email', emailHtml(mail));
      await wait(t, 5500);
    } },

    { title: 'Technical overview', est: 26, async run(t) {
      await loadStatic();
      phone({ ...AYESHA, label: 'Workflow view' });
      caption('<b>Scene 6 · Under the hood.</b> One n8n workflow file, six sections. Nodes highlighted below ran during this walkthrough.');
      const kindsLegend = `<div class="legend" style="margin-bottom:10px"><span class="pill real">real</span> Code node &nbsp;<span class="pill logic">logic</span> Set / IF / Switch &nbsp;<span class="pill simulated">simulated</span> provider in this demo &nbsp;<span class="pill entry">entry</span> trigger</div>`;
      const roles = {
        '1 · Inbound channels': 'Triggers for WhatsApp, Instagram (webhook + signature check) and ManyChat; Normalize Message turns every payload into one shape.',
        '2 · Context (one place to configure a client)': 'Client Config holds every client-specific value. Three Google Sheets reads load the knowledge base, the lead and the conversation history; Assemble Context builds the prompt context and triages bot / human / duplicate.',
        '3 · AI brain + guardrails': 'Build Claude Request writes the prompt and JSON schema; Ask Claude calls the Anthropic API; Parse Claude Response applies the guardrails and decides answer / book / hand-off.',
        '4 · Actions': 'Slot validation, Google Calendar free/busy, event creation and the booking-race check; the deterministic reply texts for every outcome.',
        '5 · Send the reply': 'Finalize Reply merges every branch and formats per channel; WhatsApp node or Instagram Send API.',
        '6 · Lead capture · memory · owner alerts': 'Upsert the lead, append the conversation log (the bot\'s memory), email the owner on hand-offs and bookings.',
      };
      const bySection = {};
      workflowMap.nodes.forEach((n) => { (bySection[n.section] = bySection[n.section] || []).push(n); });
      $('tech-meta').textContent = `${workflowMap.nodeCount} nodes · ${workflowMap.sections.length} sections · ${player.usedNodes.size} ran in this walkthrough`;
      show('tech', kindsLegend + `<div class="sections">${Object.entries(bySection).map(([sec, nodes]) => `<div class="section"><h4>${esc(sec)}</h4><p class="muted" style="margin:0 0 8px">${esc(roles[sec] || '')}</p><div class="trace">${nodes.map((n) => `<span class="node-chip ${n.kind} ${player.usedNodes.has(n.name) ? 'lit' : 'dim'}">${esc(n.name)}</span>`).join('')}</div></div>`).join('')}</div><p class="muted" style="margin:10px 0 0">A second small workflow (Error Trigger → Gmail) emails the owner if a run fails. Credentials needed in production: WhatsApp OAuth + API, Google Sheets, Google Calendar, Gmail, Anthropic, Crypto (Meta app secret), Header Auth for Instagram and ManyChat.</p>`);
      await wait(t, 9000);
      caption('Why it is safe to hand to a client: every client-specific value lives in one node, the model never books or confirms anything by itself, and every check that matters is deterministic code outside the model.');
      await wait(t, 8000);
      caption('The seven Code nodes are kept as plain files with 42 unit tests; this preview adds smoke tests that run the full graph.');
      await wait(t, 5000);
    } },

    { title: 'Honest closing', est: 18, async run(t) {
      phone({ ...AYESHA, label: 'Thanks for watching' });
      caption('<b>Scene 7 · Where this stands.</b>');
      show('closing', `<div class="sections"><div class="section"><h4>✅ Implemented</h4><ul class="checklist"><li>Importable n8n workflow (49 nodes) + error-alert workflow</li><li>WhatsApp Cloud API, Instagram (Meta API or ManyChat)</li><li>Sheet-driven FAQ answers with cited rows, optional strict mode</li><li>Lead capture, conversation memory, owner emails</li><li>Calendar booking with slot validation and race check</li><li>Human hand-off with pause and auto-resume</li><li>Guardrails: confidence, price guard, hard triggers, API-error fallback</li></ul></div><div class="section"><h4>🧪 Tested here</h4><ul class="checklist"><li>42 unit tests on the Code nodes</li><li>Smoke tests running the whole workflow graph with simulated providers</li><li>This walkthrough: the same real logic, live, on this machine</li><li>Node parameters checked against the published n8n package</li></ul></div><div class="section"><h4>⏳ Still requires</h4><ul class="checklist"><li>Live credentials: Meta (WhatsApp, Instagram), Google (Sheets, Calendar, Gmail), Anthropic</li><li>An import into a running n8n instance and acceptance testing with real phones</li><li>A real model: replies here come from a local rule-based stand-in, not Claude</li><li>Client-approved knowledge base content and a public HTTPS endpoint</li></ul></div></div><p class="muted" style="margin:10px 0 0">Not claimed: live message delivery, real model responses, Google connectivity, actual email delivery, production readiness, client work or hiring outcomes. Fictional customers and prices throughout.</p>`);
      await wait(t, 9000);
      caption('Thank you. Press <b>Restart</b> to watch again, or open the chat preview to try your own messages.');
      await wait(t, 4000);
    } },
  ];

  // ------------------------------------------------------------ player
  const total = scenes.reduce((a, s) => a + s.est, 0);
  const mins = Math.floor(total / 60), rem = total % 60;
  $('duration').textContent = `≈ ${rem < 15 ? `${mins}` : rem < 45 ? `${mins}½` : `${mins + 1}`} min · ${scenes.length} scenes`;
  $('scenes').innerHTML = scenes.map((s, i) => `<button class="scene-pill" role="tab" data-i="${i}">${i + 1}. ${esc(s.title)} <span class="muted">· ${s.est}s</span></button>`).join('');
  $('scenes').addEventListener('click', (e) => { const b = e.target.closest('.scene-pill'); if (b) goTo(Number(b.dataset.i), true); });

  function setStatus(text, cls) { $('status').textContent = text; $('dot').className = 'status-dot ' + (cls || ''); }
  function updateUi() {
    [...$('scenes').children].forEach((b, i) => { b.classList.toggle('active', i === player.idx); b.classList.toggle('done', i < player.idx); });
    $('scene-label').textContent = player.idx >= 0 ? `Scene ${player.idx + 1} of ${scenes.length} · ${scenes[player.idx].title}` : `Scene — of ${scenes.length}`;
    $('play').innerHTML = !player.playing ? '▶ Start' : player.paused ? '▶ Resume' : '❚❚ Pause';
    $('play').setAttribute('aria-label', !player.playing ? 'Start' : player.paused ? 'Resume' : 'Pause');
    $('prev').disabled = player.idx <= 0; $('next').disabled = player.idx >= scenes.length - 1 && !player.playing;
  }
  function startClock() {
    if (player.tick) clearInterval(player.tick);
    player.tick = setInterval(() => {
      if (player.playing && !player.paused) player.elapsed += 0.25;
      const done = scenes.slice(0, Math.max(0, player.idx)).reduce((a, s) => a + s.est, 0);
      const inScene = Math.min(scenes[Math.max(0, player.idx)].est, player.elapsed - player.sceneStart);
      $('bar').style.width = `${Math.min(100, ((done + Math.max(0, inScene)) / total) * 100)}%`;
      $('clock').textContent = `${fmt(player.elapsed)} / ≈${fmt(total)}`;
    }, 250);
  }
  async function playScene(i) {
    if (player.token) player.token.cancelled = true;
    const token = { cancelled: false }; player.token = token;
    player.idx = i; player.sceneStart = player.elapsed; clearPanels(); updateUi();
    setStatus(player.paused ? 'Paused' : 'Playing', player.paused ? 'paused' : 'live');
    try {
      await scenes[i].run(token);
      if (!token.cancelled && player.playing) {
        if (i + 1 < scenes.length) return playScene(i + 1);
        player.playing = false; setStatus('Finished', ''); updateUi();
      }
    } catch (e) {
      if (!(e instanceof Cancelled)) { console.error(e); caption(`<span class="pill bad">Preview error</span> ${esc(e.message)}`, 'Is the local server running? Try Restart.'); player.playing = false; setStatus('Error', ''); updateUi(); }
    }
  }
  function goTo(i, fromUser) {
    if (i < 0 || i >= scenes.length) return;
    if (!player.playing) { player.playing = true; player.elapsed = scenes.slice(0, i).reduce((a, s) => a + s.est, 0); startClock(); }
    else player.elapsed = scenes.slice(0, i).reduce((a, s) => a + s.est, 0);
    if (fromUser && player.paused) resume();
    playScene(i);
  }
  function pause() { if (!player.playing || player.paused) return; player.paused = true; setStatus('Paused', 'paused'); updateUi(); }
  function resume() { if (!player.paused) return; player.paused = false; const w = player.resumeWaiters; player.resumeWaiters = []; w.forEach((r) => r()); setStatus('Playing', 'live'); updateUi(); }
  async function start() { await api('reset', {}); player.usedNodes.clear(); player.playing = true; player.paused = false; player.elapsed = 0; startClock(); playScene(0); }
  $('play').onclick = () => { if (!player.playing) start(); else if (player.paused) resume(); else pause(); };
  $('restart').onclick = () => { if (player.token) player.token.cancelled = true; player.paused = false; start(); };
  $('prev').onclick = () => goTo(player.idx - 1, true);
  $('next').onclick = () => goTo(player.idx + 1, true);
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); $('play').click(); }
    if (e.key === 'ArrowRight') $('next').click();
    if (e.key === 'ArrowLeft') $('prev').click();
    if (e.key.toLowerCase() === 'r') $('restart').click();
  });
  updateUi();
  loadStatic().catch(() => {});
})();
