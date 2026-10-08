// Chat preview: talks to the local API. Session id lives in localStorage so each browser has its own isolated demo data.
(() => {
  const $ = (id) => document.getElementById(id);
  let session = null;
  try { session = localStorage.getItem('bs-preview-session'); } catch (e) {}
  if (!session) { session = 'demo-' + Math.random().toString(36).slice(2, 10); try { localStorage.setItem('bs-preview-session', session); } catch (e) {} }
  $('session').textContent = 'session: ' + session;
  const api = (path, body) => fetch(`/api/session/${session}/${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}).then((r) => r.json());
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let last = null, tab = 'leads';

  function bubble(kind, text) {
    const el = document.createElement('div');
    el.className = 'bubble ' + kind;
    el.innerHTML = esc(text) + `<time>${time()}</time>`;
    $('chat').appendChild(el); $('chat').scrollTop = $('chat').scrollHeight;
    return el;
  }
  function render() {
    if (!last) return;
    $('ms').textContent = `${last.ms} ms · ${last.nodes_run.length} nodes`;
    $('trace').innerHTML = last.trace.map((t) => `<span class="node-chip ${t.kind}" title="${esc(t.kindLabel)}\n${esc(t.summary)}">${esc(t.node)}</span>`).join('');
    const rows = [['Triage', last.triage], ['Decision', last.decision ?? '—'], ['Intent / confidence', last.intent ? `${last.intent} · ${last.confidence}` : '—'], ['Knowledge rows cited', last.kb_refs && last.kb_refs.length ? last.kb_refs.join(', ') : '—'], ['Guardrails', last.guardrails.length ? last.guardrails.join(' · ') : 'none triggered'], ['Lead status', last.lead ? last.lead.status : '—']];
    $('verdict').innerHTML = rows.map(([k, v]) => `<b>${k}</b><span>${esc(v)}</span>`).join('');
    renderTab();
  }
  async function renderTab() {
    const st = await api('state');
    const body = $('tabbody');
    const table = (rows, cols) => rows.length ? `<div style="overflow:auto"><table class="data"><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</table></div>` : '<span class="empty">No rows yet.</span>';
    if (tab === 'leads') body.innerHTML = table(st.leads, ['contact_key', 'name', 'phone', 'service_interest', 'status', 'booking_datetime', 'last_intent', 'handoff_reason']);
    if (tab === 'conversations') body.innerHTML = table(st.conversations.slice(-8).reverse(), ['timestamp', 'customer_name', 'customer_message', 'bot_reply', 'intent', 'decision', 'guardrails', 'kb_refs']);
    if (tab === 'calendar') body.innerHTML = st.calendar.length ? st.calendar.map((e) => `<div class="kbrow"><span class="id">📅</span><div><b>${esc(e.summary)}</b><div class="muted">${esc(e.start.dateTime)} → ${esc(e.end.dateTime)} · id ${esc(e.id)} · <span class="pill simulated">simulated</span></div><pre style="margin-top:6px">${esc(e.description)}</pre></div></div>`).join('<div style="height:8px"></div>') : '<span class="empty">No events yet.</span>';
    if (tab === 'emails') body.innerHTML = st.emails.length ? st.emails.slice().reverse().map((m) => `<div class="email"><div class="email-h"><b>${esc(m.subject)}</b> <span class="pill simulated">simulated · not sent</span><br><span class="muted">to ${esc(m.to)} · ${esc(m.at)}</span></div><pre>${esc(m.text)}</pre></div>`).join('<div style="height:8px"></div>') : '<span class="empty">No owner emails yet.</span>';
    if (tab === 'request') body.innerHTML = last && last.claude_request ? `<p class="muted" style="margin-top:0">This is the exact request body the <b>Ask Claude</b> node would send to the Anthropic API. In this preview it is answered by a local rule-based responder, not by Claude.</p><pre>${esc(JSON.stringify({ ...last.claude_request, system: last.claude_request.system.map((s) => ({ ...s, text: s.text.length > 1200 ? s.text.slice(0, 1200) + ' …[truncated for display]' : s.text })) }, null, 2))}</pre>` : '<span class="empty">No model request yet (the last message did not reach the model).</span>';
  }
  async function send() {
    const text = $('text').value.trim();
    if (!text) return;
    $('text').value = ''; $('send').disabled = true;
    bubble('out', text);
    const typing = document.createElement('div'); typing.className = 'typing'; typing.innerHTML = '<i></i><i></i><i></i>'; $('chat').appendChild(typing); $('chat').scrollTop = $('chat').scrollHeight;
    const r = await api('message', { channel: $('channel').value, contact_id: $('contact').value.trim(), contact_name: $('name').value.trim(), text, hooks: $('hook').checked ? { invented_price: true } : {} });
    typing.remove(); $('send').disabled = false;
    if (!r.ok) { bubble('system', 'Preview error: ' + (r.error && r.error.message || r.error)); last = r; render(); return; }
    if (r.reply) bubble('in', r.reply);
    else if (r.triage === 'human') bubble('system', 'No automatic reply: a person is handling this chat (lead status = human). The owner was notified.');
    else if (r.triage === 'ignore') bubble('system', 'Duplicate delivery ignored (same message id already logged).');
    else bubble('system', 'No reply was produced.');
    last = r; render();
  }
  $('send').onclick = send;
  $('text').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  $('channel').onchange = () => { $('screen').classList.toggle('instagram', $('channel').value === 'instagram'); $('chan-label').textContent = $('channel').value === 'instagram' ? 'Instagram · direct messages' : 'WhatsApp · business account'; if ($('channel').value === 'instagram' && $('contact').value === '923001234567') { $('contact').value = '1234567890123456'; $('name').value = ''; } };
  $('reset').onclick = async () => { await api('reset', {}); $('chat').innerHTML = '<div class="bubble system">Session reset. All demo data for this browser was cleared.</div>'; last = null; $('trace').innerHTML = '<span class="empty">Send a message to see which workflow nodes ran.</span>'; $('verdict').innerHTML = ''; renderTab(); };
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (!b) return; tab = b.dataset.tab; [...$('tabs').children].forEach((x) => x.classList.toggle('active', x === b)); renderTab(); });
  renderTab();
})();
