// Mortar ops console. Vanilla JS: one state snapshot from /api/state, refreshed on every
// Server-Sent Event, rendered into a handful of panels. Everything is escaped.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = (n) => Number(n ?? 0).toLocaleString("en-US");
const money = (n) => `$${Number(n ?? 0).toFixed(Number(n) >= 1 ? 2 : 4)}`;

// Console API token (CONSOLE_TOKEN): open the console once as /?token=… and it is remembered.
const TOKEN = (() => {
  const fromUrl = new URLSearchParams(location.search).get("token");
  try {
    if (fromUrl) localStorage.setItem("mortar-token", fromUrl);
    return fromUrl ?? localStorage.getItem("mortar-token");
  } catch {
    return fromUrl;
  }
})();
const withToken = (path) => (TOKEN ? `${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(TOKEN)}` : path);

let state = null;
let fetchedAt = Date.now();
const ui = { tab: "pipeline", caseId: null, detail: null, openTraces: new Set(), openThreads: new Set(), seen: new Set(), firstLoad: true };

const PLAYBOOK_LABEL = { maintenance: "Maintenance & emergencies", leasing: "Leasing", leadgen: "Owner lead generation" };
const NODE_ICON = { ok: "✓", skip: "–", local: "L", frontier: "F", warn: "!", error: "×" };
const KIND_ICON = { inbound: "↓", outbound: "↑", decision: "◆", model: "✦", state: "→", escalation: "!", approval: "✋", action: "⚙", note: "•" };

// ── Data ──────────────────────────────────────────────────────────────────────

async function api(path, body) {
  const res = await fetch(withToken(`/api${path}`), body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function refresh() {
  try {
    state = await api("/state");
    fetchedAt = Date.now();
    ui.detail = ui.caseId ? await api(`/cases/${ui.caseId}`).catch(() => null) : null;
    render();
  } catch (err) {
    toast(`Refresh failed: ${err.message}`);
  }
}

let timer = null;
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(refresh, 120);
};

const stream = new EventSource(withToken("/api/stream"));
for (const type of ["trace", "case", "outbox", "world", "story", "learning", "duplicate", "reset"]) {
  stream.addEventListener(type, () => {
    if (type === "reset") {
      ui.caseId = null;
      ui.seen.clear();
      ui.firstLoad = true;
    }
    schedule();
  });
}

async function act(fn, ok) {
  try {
    await fn();
    if (ok) toast(ok);
    await refresh();
  } catch (err) {
    toast(err.message);
  }
}

function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 2600);
}

// ── Time ──────────────────────────────────────────────────────────────────────

const tz = () => state?.timezone ?? "America/Chicago";
const simNow = () => new Date(Date.parse(state.now) + (state.simulatedClock ? Date.now() - fetchedAt : 0));
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-US", { timeZone: tz(), hour: "numeric", minute: "2-digit" });
const fmtDayTime = (iso) => new Date(iso).toLocaleString("en-US", { timeZone: tz(), weekday: "short", hour: "numeric", minute: "2-digit" });

function renderClock() {
  if (!state) return;
  const now = simNow();
  const day = now.toLocaleDateString("en-US", { timeZone: tz(), weekday: "short", month: "short", day: "numeric" });
  const time = now.toLocaleTimeString("en-US", { timeZone: tz(), hour: "numeric", minute: "2-digit", second: "2-digit" });
  $("clock").innerHTML = `
    <span class="status-pill" title="All times are Austin (America/Chicago)"><span class="dot on"></span>${state.simulatedClock ? "Simulated clock" : "Live clock"}</span>
    <span class="time">${esc(day)} · ${esc(time)}</span>
    ${state.demo ? `<button class="btn small" data-adv="10">+10 min</button><button class="btn small" data-adv="60">+1 h</button><button class="btn small" data-adv="1440">+1 day</button>` : ""}`;
}
setInterval(renderClock, 1000);

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  if (!state) return;
  renderClock();
  renderProviders();
  renderKpis();
  renderStory();
  renderCases();
  renderTabs();
  renderView();
  renderApprovals();
  renderPhones();
  renderSystems();
  for (const t of state.traces) ui.seen.add(t.eventId);
  ui.firstLoad = false;
}

function renderProviders() {
  const p = state.providers;
  const real = (x) => !["none", "simulated"].includes(x.provider);
  const pill = (label, x) => `<span class="status-pill" title="${esc(x.detail)}"><span class="dot ${x.available ? "on" : "off"}"></span>${label}: ${esc(x.provider)}${real(x) ? ` · ${esc(x.model)}` : ""}</span>`;
  $("providers").innerHTML = pill("Local model", p.local) + pill("Frontier model", p.frontier);
}

function renderKpis() {
  const k = state.kpis;
  const tile = (label, value, sub) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
  $("kpis").innerHTML = [
    tile("Decision points", num(k.decisionPoints), `<span class="good">${k.decidedByRulesPct}%</span> decided by rules alone`),
    tile("Model calls", `${num(k.modelCalls.local)} <small style="font-size:12px;color:var(--local)">local</small> · ${num(k.modelCalls.frontier)} <small style="font-size:12px;color:var(--frontier)">frontier</small>`, `naive design: ${num(k.naiveCalls)} frontier calls`),
    tile("Tokens", num(k.tokens.used), `vs ${num(k.tokens.naive)} naive · <span class="good">−${k.tokens.savedPct}%</span>`),
    tile("Model spend", money(k.costUsd.used), `vs ${money(k.costUsd.naive)} naive (estimated)`),
    tile("Open cases", num(k.openCases), `${num(k.awaitingHuman)} need a person · ${num(k.deadLetters)} dead letters`),
    tile("P1 first response", k.p1FirstResponseMs == null ? "—" : `${k.p1FirstResponseMs} ms`, "event in → all actions committed"),
  ].join("");
}

function renderStory() {
  const s = state.stories;
  const a = s.active;
  const options = s.list.map((x) => `<option value="${x.id}" ${a?.id === x.id ? "selected" : ""}>${esc(x.title)}</option>`).join("");
  let body;
  if (!a) {
    body = `<div class="say" style="color:var(--muted);margin-top:8px;font-size:12px">Pick a story and press Start. Each step plays the other side (tenant, vendor, owner…) through the real webhook path; everything Mortar does is the live pipeline.</div>`;
  } else if (a.next) {
    body = `<div class="step"><div class="n">Step ${a.index + 1} of ${a.total}</div><div class="t">${esc(a.next.title)}</div><div class="say">${esc(a.next.say)}</div></div>
      ${a.last ? `<div class="last">✓ ${esc(a.last.title)}</div>` : ""}`;
  } else {
    body = `<div class="step"><div class="n">Story complete</div><div class="t">${esc(a.title)}</div><div class="say">Explore the cases, traces and model ledger — or start another story.</div></div>`;
  }
  $("story").innerHTML = `
    <header><h2>Demo story</h2><span class="count">${a ? `${Math.min(a.index, a.total)}/${a.total}` : ""}</span></header>
    <div class="body">
      <select id="story-select">${options}</select>
      ${body}
      ${a ? `<div class="progress"><div style="width:${(Math.min(a.index, a.total) / a.total) * 100}%"></div></div>` : ""}
      <div class="actions">
        ${a?.next ? `<button class="btn primary" id="story-next" ${a.running ? "disabled" : ""}>Next step ▶</button>` : ""}
        <button class="btn ${a?.next ? "" : "primary"}" id="story-start">${a ? "Restart" : "Start"}</button>
      </div>
      ${state.demo ? `<div class="subhead" style="padding:12px 0 4px">Break things on purpose</div>
      <div class="chaos">
        <button class="btn small" data-chaos="sms">Twilio SMS outage ×2</button>
        <button class="btn small" data-chaos="local">${state.providers.local.available ? "Take local model down" : "Restore local model"}</button>
        <button class="btn small" data-chaos="frontier">${state.providers.frontier.available ? "Take frontier down" : "Restore frontier"}</button>
      </div>` : ""}
    </div>`;
}

function renderCases() {
  const groups = {};
  for (const c of state.cases) (groups[c.playbook] ??= []).push(c);
  $("case-count").textContent = state.cases.length ? `${state.cases.length}` : "";
  if (!state.cases.length) {
    $("cases").innerHTML = `<div class="empty">No cases yet — start a demo story.</div>`;
    return;
  }
  $("cases").innerHTML = Object.entries(groups)
    .map(
      ([playbook, cases]) => `<div class="group-label">${esc(PLAYBOOK_LABEL[playbook] ?? playbook)}</div>` +
        cases
          .map(
            (c) => `<div class="case-row ${ui.caseId === c.id ? "active" : ""}" data-case="${c.id}">
          <div class="line1"><span class="id">${c.id}</span>${c.priority ? `<span class="badge ${c.priority}">${c.priority}</span>` : ""}<span class="badge ${c.closed ? "closed" : ""}">${esc(c.statusLabel)}</span>${c.flags?.needsHuman ? `<span class="badge human">needs a person</span>` : ""}</div>
          <div class="title">${esc(c.title)}</div>
          <div class="sum">${esc(c.summary)}</div>
        </div>`
          )
          .join("")
    )
    .join("");
}

function renderTabs() {
  const tabs = [
    ["pipeline", "Pipeline", state.traces.length],
    ["case", ui.caseId ? `Case ${ui.caseId}` : "Case", ""],
    ["models", "Model ledger", state.modelCalls.filter((m) => !["unavailable", "over_budget"].includes(m.outcome)).length],
    ["outbox", "Outbox", state.outbox.length],
    ["how", "How it works", ""],
  ];
  $("tabs").innerHTML = tabs.map(([id, label, n]) => `<button class="tab ${ui.tab === id ? "active" : ""}" data-tab="${id}">${esc(label)}${n !== "" ? `<span class="n">${n}</span>` : ""}</button>`).join("");
}

function renderView() {
  const views = { pipeline: viewPipeline, case: viewCase, models: viewModels, outbox: viewOutbox, how: viewHow };
  $("view").innerHTML = views[ui.tab]();
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

function viewPipeline() {
  if (!state.traces.length) return `<div class="empty">Every event — a tenant SMS, a vendor keypress, a timer, a webhook — shows up here with its nine stages.</div>`;
  return state.traces.map(traceCard).join("");
}

function traceCard(t) {
  const fresh = !ui.firstLoad && !ui.seen.has(t.eventId);
  const system = t.type.startsWith("action.");
  const stage = (key) => t.stages.find((s) => s.key === key);
  const model = stage("model");
  const tokens = t.model.inputTokens + t.model.outputTokens;
  const baseline = t.baseline ? t.baseline.inputTokens + t.baseline.outputTokens : null;
  const rail = t.stages
    .map((s, i) => `<div class="stage ${s.status}" style="--i:${i}" title="${esc(s.label)}: ${esc(s.summary)}"><div class="node">${NODE_ICON[s.status] ?? "·"}</div><div class="name">${esc(s.label)}</div></div>`)
    .join("");
  const line = (key, label, cls = "") => {
    const s = stage(key);
    return s && s.summary !== "—" ? `<dt>${label}</dt><dd class="${cls}">${esc(s.summary)}</dd>` : "";
  };
  const more = t.stages
    .map((s) => `<dt>${esc(s.label)}</dt><dd>${esc(s.summary)}${s.detail ? `<div class="detail">${esc(JSON.stringify(s.detail, null, 2))}</div>` : ""}<span style="color:var(--faint)"> · ${s.ms} ms</span></dd>`)
    .join("");
  return `<div class="trace ${fresh ? "fresh" : ""} ${system ? "system" : ""} ${ui.openTraces.has(t.eventId) ? "open" : ""}" data-trace="${t.eventId}">
    <div class="head">
      <span class="when">${fmtDayTime(t.at)}</span>
      <span class="what">${esc(t.headline ?? stage("event")?.summary ?? t.type)}</span>
      ${t.caseId ? `<span class="case-link" data-case="${t.caseId}">${t.caseId}</span>` : ""}
      <span class="cost">${t.outcome === "failed" ? "FAILED · " : ""}${tokens ? `${num(tokens)} tok` : "0 tok"}${baseline ? ` · naive ${num(baseline)}` : ""} · ${t.durationMs} ms</span>
    </div>
    <div class="rail">${rail}</div>
    ${system ? "" : `<dl class="facts">${line("state", "State")}${line("logic", "Logic")}${line("retrieval", "Retrieval")}${line("model", "Model", `model-${model?.status}`)}${line("action", "Action")}${line("validation", "Validation")}${line("next", "Next")}</dl>`}
    <div class="more"><dl class="facts">${more}</dl></div>
  </div>`;
}

// ── Case ──────────────────────────────────────────────────────────────────────

function viewCase() {
  const d = ui.detail;
  if (!d) return `<div class="empty">Select a case on the left (or a case id in the pipeline).</div>`;
  const c = d.case;
  const path = d.machine.mainPath;
  const at = path.indexOf(c.status);
  const track = path
    .map((s, i) => `<span class="s ${i < at ? "done" : i === at ? "now" : ""}">${esc(d.machine.labels[s] ?? s)}</span>`)
    .join(`<span class="arrow">›</span>`);
  const offPath = at === -1 ? `<span class="s now">${esc(c.statusLabel)}</span>` : "";
  const ext = Object.entries(c.external ?? {}).map(([k, v]) => `<span class="badge">${esc(k)}: ${esc(v)}</span>`).join(" ");
  const flags = Object.entries(c.flags ?? {}).filter(([, v]) => v).map(([k]) => `<span class="badge human">${esc(k)}</span>`).join(" ");
  const timers = d.timers.length
    ? d.timers.map((t) => `<span class="timer">${esc(t.kind.replace(/_/g, " "))} · ${fmtDayTime(t.dueAt)}</span>`).join("")
    : `<span style="color:var(--faint);font-size:12px">none pending</span>`;
  const timeline = d.log
    .map((e) => `<div class="entry ${e.kind}"><span class="t">${fmtTime(e.at)}</span><span class="k" title="${e.kind}">${KIND_ICON[e.kind] ?? "•"}</span><span class="x">${esc(e.text)}</span></div>`)
    .join("");
  const models = d.modelCalls.filter((m) => !["unavailable", "over_budget"].includes(m.outcome));
  return `<div class="case-head">
      <h3>${esc(c.title)}</h3>
      <div class="meta"><span class="mono">${c.id}</span>${c.priority ? `<span class="badge ${c.priority}">${c.priority}</span>` : ""}<span>${esc(PLAYBOOK_LABEL[c.playbook] ?? c.playbook)}</span>${flags}${ext}</div>
      <div class="track">${track}${offPath}</div>
      <div class="case-summary"><span class="k">Rolling summary — rebuilt from structured facts by code (this is what a model sees, not the transcript)</span>${esc(c.summary)}</div>
    </div>
    <div class="subhead">Next actions (durable timers)</div>
    <div class="timers">${timers}</div>
    <div class="subhead">Timeline</div>
    <div class="timeline">${timeline}</div>
    ${models.length ? `<div class="subhead">Model calls on this case</div>${modelTable(models)}` : ""}`;
}

// ── Models ────────────────────────────────────────────────────────────────────

function modelTable(rows) {
  return `<div class="table-wrap"><table><thead><tr><th>Time</th><th>Task</th><th>Tier</th><th>Model</th><th>Outcome</th><th class="num">In</th><th class="num">Out</th><th class="num">Cost</th><th class="num">ms</th></tr></thead><tbody>
    ${rows
      .map(
        (m) => `<tr><td>${fmtTime(m.at)}</td><td class="mono">${esc(m.task)}</td><td><span class="badge ${m.tier}">${m.tier}</span></td><td class="mono">${esc(m.provider)} · ${esc(m.model)}</td><td><span class="st ${m.outcome}">${esc(m.outcome)}</span>${m.error ? `<div style="color:var(--faint);font-size:11px">${esc(m.error)}</div>` : ""}</td><td class="num">${num(m.inputTokens)}</td><td class="num">${num(m.outputTokens)}</td><td class="num">${m.costUsd ? money(m.costUsd) : "—"}</td><td class="num">${m.latencyMs}</td></tr>`
      )
      .join("")}</tbody></table></div>`;
}

function viewModels() {
  const why = state.tasks.map((t) => `<div><b>${esc(t.name)}</b> <span class="badge">${esc(t.tiers.join(" → "))}</span> — ${esc(t.why)}</div>`).join("");
  const simulated = state.providers.local.simulated || state.providers.frontier.simulated;
  return `<div class="why"><div style="font-weight:600;margin-bottom:4px">Every model task, and why it needs a model</div>${why}
    ${simulated ? `<div style="margin-top:6px;color:var(--warn)">Simulated tiers are running (token counts estimated). Set LOCAL_MODEL_PROVIDER=ollama and ANTHROPIC_API_KEY for real models.</div>` : ""}</div>
    ${state.modelCalls.length ? modelTable(state.modelCalls) : `<div class="empty">No model calls yet.</div>`}`;
}

// ── Outbox ────────────────────────────────────────────────────────────────────

function viewOutbox() {
  if (!state.outbox.length) return `<div class="empty">Actions appear here after validation, then leave through the connectors with retries.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Queued</th><th>Action</th><th>Connector</th><th>Status</th><th class="num">Tries</th><th>Next / error</th></tr></thead><tbody>
    ${state.outbox
      .map(
        (a) => `<tr><td>${fmtTime(a.createdAt)}</td><td>${esc(a.label)}${a.caseId ? ` <span class="mono" style="color:var(--faint)">${a.caseId}</span>` : ""}</td><td class="mono">${esc(a.connector)}.${esc(a.operation)}</td><td><span class="st ${a.status}">${esc(a.status)}</span></td><td class="num">${a.attempts}</td><td style="font-size:11.5px;color:var(--muted)">${a.status === "pending" && Date.parse(a.nextAttemptAt) > Date.parse(state.now) ? `sends ${fmtDayTime(a.nextAttemptAt)}` : ""}${a.lastError ? `<div style="color:var(--error)">${esc(a.lastError)}</div>` : ""}</td></tr>`
      )
      .join("")}</tbody></table></div>`;
}

// ── How it works ──────────────────────────────────────────────────────────────

function viewHow() {
  const stages = [
    ["Event", "Webhook or timer → normalized envelope, deduplicated by idempotency key, persisted before anything else."],
    ["State", "Directory + case store: who is this, which case, what's already happening. SQL, no model."],
    ["Deterministic logic", "The playbook's rules decide what they can: severity, routing, policy, reply parsing."],
    ["Retrieval", "Only the context the next step needs: structured lookups first, scoped document chunks second."],
    ["Model (if needed)", "Only when rules can't decide. Local first; frontier when the task justifies it. Schema-validated, with fallbacks."],
    ["Action", "A declarative plan: messages, work orders, CRM writes, pages."],
    ["Validation", "Policy: allow · defer (quiet hours) · needs approval (spend, sensitive, model-written risk) · block (opt-out, fair housing)."],
    ["State update", "One transaction: case, timeline, approvals, outbox, timers — nothing half-done."],
    ["Next action", "Durable timers schedule the follow-through; the outbox executes with retries and dead-letters."],
  ];
  return `<div class="body">
    <dl class="facts" style="grid-template-columns:150px minmax(0,1fr);gap:8px 12px">${stages.map(([a, b], i) => `<dt><b>${i + 1}. ${a}</b></dt><dd>${b}</dd>`).join("")}</dl>
    <div class="why" style="margin:14px 0 0"><b>Principles.</b> Rules before models · models may raise severity, never lower it · safety instructions are vetted templates, never generated · facts and rolling summaries instead of transcripts · every side effect idempotent · people own judgment, risk and relationships.</div>
  </div>`;
}

// ── Human queue ───────────────────────────────────────────────────────────────

function renderApprovals() {
  const list = state.approvals;
  $("approval-count").textContent = list.length ? `${list.length} waiting` : "";
  if (!list.length) {
    $("approvals").innerHTML = `<div class="empty">Nothing waiting. Spend over limits, sensitive replies and A-tier first emails land here.</div>`;
    return;
  }
  $("approvals").innerHTML = list
    .map((a) => {
      const editable = a.actions.filter((x) => x.payload?.body);
      return `<div class="approval" data-approval="${a.id}">
        <div class="reason">${esc(a.reason)}</div>
        <div class="what">${esc(a.summary)}</div>
        ${editable.map((x) => `<textarea data-edit="${esc(x.key)}">${esc(x.payload.body)}</textarea>`).join("")}
        <div class="row"><button class="btn ok small" data-decide="approved">Approve${editable.length ? " (with edits)" : ""}</button><button class="btn small" data-decide="rejected">Reject</button><span class="case-link" data-case="${a.caseId}">${a.caseId}</span></div>
      </div>`;
    })
    .join("");
}

// ── Phones & inboxes ──────────────────────────────────────────────────────────

function renderPhones() {
  const lines = state.lines;
  const ours = new Set(Object.keys(lines));
  const party = (address) => state.directory.find((p) => p.phone === address || p.email === address);
  const threads = new Map();
  const add = (address, item) => {
    if (!address || ours.has(address)) return;
    const t = threads.get(address) ?? { address, items: [], last: "" };
    t.items.push(item);
    if (item.at > t.last) t.last = item.at;
    threads.set(address, t);
  };
  for (const m of state.world.messages) add(m.direction === "outbound" ? m.to : m.from, { type: "msg", ...m });
  for (const c of state.world.calls) add(c.to, { type: "call", ...c });
  const sorted = [...threads.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
  if (!sorted.length) {
    $("phones").innerHTML = `<div class="empty">Every text, email and call Mortar sends shows up here, per person. You can reply as them.</div>`;
    return;
  }
  $("phones").innerHTML = sorted
    .map((t) => {
      const p = party(t.address);
      const items = t.items.sort((a, b) => (a.at < b.at ? -1 : 1));
      const body = items
        .map((i) => {
          if (i.type === "call") {
            const ringing = i.status === "ringing";
            return `<div class="callcard">📞 <b>Call from Northwind</b> · ${fmtTime(i.at)} · ${esc(i.status)}<div style="margin-top:3px;color:var(--muted)">“${esc(i.say)}”</div>${ringing ? `<div class="keys"><button class="btn small" data-key="1" data-phone="${esc(t.address)}">Press 1</button><button class="btn small" data-key="2" data-phone="${esc(t.address)}">Press 2</button></div>` : ""}</div>`;
          }
          return `<div class="bubble ${i.direction === "outbound" ? "out" : "in"}"><span class="meta">${i.channel === "email" ? "✉ " : ""}${fmtTime(i.at)}${i.subject ? ` · ${esc(i.subject)}` : ""}</span>${esc(i.body)}</div>`;
        })
        .join("");
      const lastOut = [...items].reverse().find((i) => i.type === "msg" && i.direction === "outbound");
      return `<div class="thread ${ui.openThreads.has(t.address) ? "open" : ""}" data-thread="${esc(t.address)}">
        <div class="who"><span class="name">${esc(p?.name ?? t.address)}</span><span class="role">${esc(p ? `${p.role}${p.title ? ` · ${p.title}` : ""}` : "")}</span><span class="last">${fmtTime(t.last)}</span></div>
        <div class="msgs">${body}</div>
        <form class="reply" data-reply="${esc(t.address)}" data-line="${esc(lastOut?.from ?? "")}" data-channel="${esc(lastOut?.channel ?? (t.address.includes("@") ? "email" : "sms"))}" data-subject="${esc(lastOut?.subject ?? "")}">
          <input name="text" placeholder="Reply as ${esc(p?.name ?? t.address)}…" autocomplete="off" /><button class="btn small">Send</button>
        </form>
      </div>`;
    })
    .join("");
}

// ── Systems ───────────────────────────────────────────────────────────────────

function renderSystems() {
  const w = state.world;
  $("modes").textContent = Object.values(state.connectors).every((m) => m === "simulated") ? "all simulated" : Object.entries(state.connectors).map(([k, v]) => `${k}:${v}`).join(" ");
  const wos = w.workOrders.map((x) => `<div class="sys-item"><span class="id">${esc(x.workOrderId)}</span><span class="txt">${esc(x.description)}</span><span class="badge">${esc(x.status)}</span></div>`).join("");
  const people = w.fubPeople.map((x) => `<div class="sys-item"><span class="id">#${x.id}</span><span class="txt">${esc(x.name)} · ${esc(x.source ?? "")}</span><span class="badge">${esc(x.stage)}</span></div>`).join("");
  const tasks = w.fubTasks.slice(-5).map((x) => `<div class="sys-item"><span class="id">task</span><span class="txt">${esc(x.name)}</span></div>`).join("");
  const appts = w.fubAppointments.map((x) => `<div class="sys-item"><span class="id">appt</span><span class="txt">${esc(x.title)} · ${fmtDayTime(x.start)}</span></div>`).join("");
  const weights = state.learning.weights;
  $("systems").innerHTML = `
    <div class="sys-group"><h4>Rentvine · work orders</h4>${wos || `<div class="empty" style="padding:2px 0">none</div>`}</div>
    <div class="sys-group"><h4>Follow Up Boss · people (${w.fubNotes} notes)</h4>${people || `<div class="empty" style="padding:2px 0">none</div>`}${tasks}${appts}</div>
    <div class="sys-group"><h4>Lead data spend &amp; learning</h4>
      <div class="sys-item"><span class="txt">Enrichment: ${num(w.enrichment.lookups ?? 0)} lookups · ${money(w.enrichment.enrichmentUsd ?? 0)}</span></div>
      <div class="sys-item"><span class="txt">Lead scorer: ${weights ? `v${weights.version}, trained on ${num(weights.trainedOn)} outcomes` : "expert priors (v0)"}</span></div>
      ${state.learning.log.length ? `<div class="sys-item"><span class="txt">Last cycle: ${state.learning.log.at(-1).promoted ? "promoted" : "kept current"} · held-out log-loss ${state.learning.log.at(-1).holdoutLogLoss.current} → ${state.learning.log.at(-1).holdoutLogLoss.candidate}</span></div>` : ""}
    </div>`;
}

// ── Events ────────────────────────────────────────────────────────────────────

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-tab],[data-case],[data-trace] .head,[data-thread] .who,[data-adv],[data-decide],[data-key],[data-chaos],#story-next,#story-start");
  if (!el) return;

  if (el.dataset.tab) {
    ui.tab = el.dataset.tab;
    return render();
  }
  if (el.dataset.case) {
    e.stopPropagation();
    ui.caseId = el.dataset.case;
    ui.tab = "case";
    return refresh();
  }
  if (el.matches("[data-trace] .head")) {
    const id = el.parentElement.dataset.trace;
    ui.openTraces.has(id) ? ui.openTraces.delete(id) : ui.openTraces.add(id);
    return el.parentElement.classList.toggle("open");
  }
  if (el.matches("[data-thread] .who")) {
    const id = el.parentElement.dataset.thread;
    ui.openThreads.has(id) ? ui.openThreads.delete(id) : ui.openThreads.add(id);
    return el.parentElement.classList.toggle("open");
  }
  if (el.dataset.adv) return act(() => api("/clock/advance", { minutes: Number(el.dataset.adv) }), `Time moved forward ${el.textContent.trim()}`);
  if (el.dataset.key) return act(() => api("/simulate/keypress", { phone: el.dataset.phone, digits: el.dataset.key }), `Pressed ${el.dataset.key}`);
  if (el.dataset.decide) {
    const card = el.closest("[data-approval]");
    const edits = {};
    for (const ta of card.querySelectorAll("textarea[data-edit]")) edits[ta.dataset.edit] = { body: ta.value };
    return act(() => api(`/approvals/${card.dataset.approval}`, { decision: el.dataset.decide, edits, by: "Console user" }), el.dataset.decide === "approved" ? "Approved" : "Rejected");
  }
  if (el.dataset.chaos) {
    const c = el.dataset.chaos;
    if (c === "sms") return act(() => api("/failures", { operation: "twilio.sendSms", count: 2 }), "Next 2 Twilio SMS sends will fail with 503 — watch the outbox retry");
    const down = state.providers[c].available;
    return act(() => api(`/models/${c}`, { down }), down ? `${c} model is down — watch the fallbacks` : `${c} model restored`);
  }
  if (el.id === "story-start") return act(() => api(`/stories/${$("story-select").value}/start`, {}), "Story ready — press Next step");
  if (el.id === "story-next") {
    el.disabled = true;
    return act(() => api("/stories/next", {}));
  }
});

document.addEventListener("submit", (e) => {
  const form = e.target.closest("[data-reply]");
  if (!form) return;
  e.preventDefault();
  const text = form.text.value.trim();
  if (!text) return;
  const { reply: address, line, channel, subject } = form.dataset;
  const call = channel === "email" ? api("/simulate/email", { from: address, to: line || "maintenance@northwind.example", subject: subject ? `Re: ${subject.replace(/^Re:\s*/i, "")}` : "Re:", body: text }) : api("/simulate/sms", { from: address, to: line || "+15125550199", body: text });
  form.text.value = "";
  act(() => call, "Sent");
});

refresh();
