import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { newId } from "./ids.js";

/**
 * The state store. One small class, grouped by aggregate. All methods are
 * synchronous (node:sqlite), so a pipeline "state update" can run inside a
 * single transaction with no awaits — state, timeline, timers and outbox
 * commit together or not at all.
 */

const SCHEMA = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

const toJson = (value) => JSON.stringify(value ?? {});
const fromJson = (text, fallback = {}) => (text ? JSON.parse(text) : fallback);
const orNull = (value) => (value === undefined ? null : value);

export class ConflictError extends Error {
  constructor(caseId) {
    super(`Case ${caseId} was modified concurrently`);
    this.name = "ConflictError";
  }
}

export function openStore(path = ":memory:") {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return new Store(db);
}

class Store {
  constructor(db) {
    this.db = db;
    this.depth = 0;
    this.statements = new Map();
  }

  /** Prepared-statement cache. */
  sql(text) {
    let stmt = this.statements.get(text);
    if (!stmt) {
      stmt = this.db.prepare(text);
      this.statements.set(text, stmt);
    }
    return stmt;
  }

  /** Run `fn` atomically. Nested calls join the outer transaction. */
  tx(fn) {
    if (this.depth > 0) return fn();
    this.db.exec("BEGIN IMMEDIATE");
    this.depth++;
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    } finally {
      this.depth--;
    }
  }

  close() {
    this.db.close();
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  /** Insert an event; returns { inserted:false } when the idempotency key was seen before. */
  insertEvent(e) {
    const existing = this.sql("SELECT id FROM events WHERE idempotency_key = ?").get(e.idempotencyKey);
    if (existing) return { inserted: false, id: existing.id };
    const id = e.id ?? newId("evt");
    this.sql(
      `INSERT INTO events (id, type, source, idempotency_key, subject, case_id, occurred_at, received_at, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, e.type, e.source, e.idempotencyKey, toJson(e.subject), orNull(e.caseId), e.occurredAt, e.receivedAt, toJson(e.payload));
    return { inserted: true, id };
  }

  getEvent(id) {
    return mapEvent(this.sql("SELECT * FROM events WHERE id = ?").get(id));
  }

  finishEvent(id, { status, caseId = null, trace = null, error = null }) {
    this.sql(
      `UPDATE events SET status = ?, case_id = COALESCE(?, case_id), trace = ?, error = ?, attempts = attempts + 1
       WHERE id = ?`
    ).run(status, caseId, trace ? JSON.stringify(trace) : null, error, id);
  }

  unprocessedEvents() {
    return this.sql("SELECT * FROM events WHERE status = 'received' ORDER BY received_at, rowid").all().map(mapEvent);
  }

  listEvents({ limit = 50, caseId } = {}) {
    const rows = caseId
      ? this.sql("SELECT * FROM events WHERE case_id = ? ORDER BY received_at DESC, rowid DESC LIMIT ?").all(caseId, limit)
      : this.sql("SELECT * FROM events ORDER BY received_at DESC, rowid DESC LIMIT ?").all(limit);
    return rows.map(mapEvent);
  }

  // ── Directory ───────────────────────────────────────────────────────────────

  upsertParty(p) {
    this.sql(
      `INSERT INTO parties (id, role, name, phone, email, property_id, unit_id, external, attributes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET role = excluded.role, name = excluded.name, phone = excluded.phone,
         email = excluded.email, property_id = excluded.property_id, unit_id = excluded.unit_id,
         external = excluded.external, attributes = excluded.attributes, updated_at = excluded.updated_at`
    ).run(
      p.id, p.role, p.name, orNull(p.phone), orNull(p.email), orNull(p.propertyId), orNull(p.unitId),
      toJson(p.external), toJson(p.attributes), p.updatedAt ?? new Date().toISOString()
    );
    return this.getParty(p.id);
  }

  getParty(id) {
    return mapParty(this.sql("SELECT * FROM parties WHERE id = ?").get(id));
  }

  findPartyByPhone(phone) {
    return mapParty(this.sql("SELECT * FROM parties WHERE phone = ? ORDER BY updated_at DESC LIMIT 1").get(phone));
  }

  findPartyByEmail(email) {
    return mapParty(this.sql("SELECT * FROM parties WHERE email = ? ORDER BY updated_at DESC LIMIT 1").get(email));
  }

  listParties({ role, propertyId } = {}) {
    let rows;
    if (role && propertyId) rows = this.sql("SELECT * FROM parties WHERE role = ? AND property_id = ? ORDER BY name").all(role, propertyId);
    else if (role) rows = this.sql("SELECT * FROM parties WHERE role = ? ORDER BY name").all(role);
    else rows = this.sql("SELECT * FROM parties ORDER BY role, name").all();
    return rows.map(mapParty);
  }

  /** Update contact fields and shallow-merge into a party's long-term memory. */
  updateParty(id, { fields = {}, attributes = {} }, now) {
    const party = this.getParty(id);
    if (!party) return null;
    const contact = Object.fromEntries(Object.entries(fields).filter(([k, v]) => ["name", "phone", "email"].includes(k) && v));
    return this.upsertParty({ ...party, ...contact, attributes: { ...party.attributes, ...attributes }, updatedAt: now });
  }

  upsertProperty(p) {
    this.sql(
      `INSERT INTO properties (id, name, address, kind, timezone, owner_id, attributes, external)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, address = excluded.address, kind = excluded.kind,
         timezone = excluded.timezone, owner_id = excluded.owner_id, attributes = excluded.attributes,
         external = excluded.external`
    ).run(p.id, p.name, p.address, p.kind, p.timezone, orNull(p.ownerId), toJson(p.attributes), toJson(p.external));
  }

  getProperty(id) {
    return mapProperty(this.sql("SELECT * FROM properties WHERE id = ?").get(id));
  }

  /** Property by an external id, e.g. ("showmojo", "SM-12CL"). */
  findPropertyByExternal(key, value) {
    return mapProperty(this.sql("SELECT * FROM properties WHERE json_extract(external, '$.' || ?) = ?").get(key, value));
  }

  listProperties() {
    return this.sql("SELECT * FROM properties ORDER BY name").all().map(mapProperty);
  }

  upsertUnit(u) {
    this.sql(
      `INSERT INTO units (id, property_id, label, floor, above_unit_id, attributes, external)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET property_id = excluded.property_id, label = excluded.label,
         floor = excluded.floor, above_unit_id = excluded.above_unit_id, attributes = excluded.attributes,
         external = excluded.external`
    ).run(u.id, u.propertyId, u.label, orNull(u.floor), orNull(u.aboveUnitId), toJson(u.attributes), toJson(u.external));
  }

  getUnit(id) {
    return mapUnit(this.sql("SELECT * FROM units WHERE id = ?").get(id));
  }

  /** The tenant(s) currently living in a unit. */
  tenantsOfUnit(unitId) {
    return this.sql("SELECT * FROM parties WHERE role = 'tenant' AND unit_id = ? ORDER BY name").all(unitId).map(mapParty);
  }

  // ── Cases ───────────────────────────────────────────────────────────────────

  /** Sequential, human-friendly ids: MC-0001 (cases), LD-0001 (leads), PR-0001 (prospects). */
  nextSequenceId(prefix) {
    const key = `seq:${prefix}`;
    const next = Number(this.getKV(key, 0)) + 1;
    this.setKV(key, next);
    return `${prefix}-${String(next).padStart(4, "0")}`;
  }

  createCase(c) {
    this.sql(
      `INSERT INTO cases (id, playbook, status, priority, title, party_id, property_id, unit_id, facts, summary,
         external, flags, version, opened_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(
      c.id, c.playbook, c.status, orNull(c.priority), c.title, orNull(c.partyId), orNull(c.propertyId),
      orNull(c.unitId), toJson(c.facts), c.summary ?? "", toJson(c.external), toJson(c.flags), c.openedAt, c.openedAt
    );
    return this.getCase(c.id);
  }

  getCase(id) {
    return mapCase(this.sql("SELECT * FROM cases WHERE id = ?").get(id));
  }

  /** Save with optimistic concurrency: fails if someone else saved first. */
  saveCase(c) {
    const result = this.sql(
      `UPDATE cases SET status = ?, priority = ?, title = ?, facts = ?, summary = ?, external = ?, flags = ?,
         version = version + 1, updated_at = ?, closed_at = ?
       WHERE id = ? AND version = ?`
    ).run(
      c.status, orNull(c.priority), c.title, toJson(c.facts), c.summary ?? "", toJson(c.external), toJson(c.flags),
      c.updatedAt, orNull(c.closedAt), c.id, c.version
    );
    if (result.changes !== 1) throw new ConflictError(c.id);
    return this.getCase(c.id);
  }

  /** Most recently updated open case for a party within a playbook. */
  findOpenCase({ playbook, partyId, unitId, statuses }) {
    const rows = this.sql(
      `SELECT * FROM cases WHERE playbook = ? AND closed_at IS NULL
         AND (party_id = ? OR (? IS NOT NULL AND unit_id = ?))
       ORDER BY updated_at DESC`
    ).all(playbook, orNull(partyId), orNull(unitId), orNull(unitId));
    const cases = rows.map(mapCase);
    return (statuses ? cases.filter((c) => statuses.includes(c.status)) : cases)[0] ?? null;
  }

  /** Case linked to an external record, e.g. ("rentvineWorkOrderId", "WO-5512") or ("fubPersonId", 1042). */
  findCaseByExternal(key, value) {
    return mapCase(
      this.sql("SELECT * FROM cases WHERE json_extract(external, '$.' || ?) = ? ORDER BY updated_at DESC LIMIT 1").get(key, value)
    );
  }

  /** Open cases matching a predicate — small sets (active dispatches, escalations). */
  openCasesWhere(predicate, { playbook } = {}) {
    return this.listCases({ playbook, openOnly: true, limit: 500 }).filter(predicate);
  }

  listCases({ playbook, openOnly = false, limit = 200 } = {}) {
    const where = [];
    const params = [];
    if (playbook) {
      where.push("playbook = ?");
      params.push(playbook);
    }
    if (openOnly) where.push("closed_at IS NULL");
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM cases ${clause} ORDER BY updated_at DESC LIMIT ?`)
      .all(...params, limit)
      .map(mapCase);
  }

  // ── Case timeline ───────────────────────────────────────────────────────────

  appendLog(caseId, { at, kind, actor = "agent", text, data = {}, eventId = null }) {
    this.sql(
      "INSERT INTO case_log (case_id, at, kind, actor, text, data, event_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(caseId, at, kind, actor, text, toJson(data), orNull(eventId));
  }

  getLog(caseId, { limit = 500 } = {}) {
    return this.sql("SELECT * FROM case_log WHERE case_id = ? ORDER BY id DESC LIMIT ?")
      .all(caseId, limit)
      .reverse()
      .map((r) => ({ id: r.id, caseId: r.case_id, at: r.at, kind: r.kind, actor: r.actor, text: r.text, data: fromJson(r.data), eventId: r.event_id }));
  }

  /** All timeline entries for a party across every case — what a naive design would send to an LLM. */
  partyHistory(partyId) {
    return this.sql(
      `SELECT l.at, l.kind, l.actor, l.text, l.data FROM case_log l JOIN cases c ON c.id = l.case_id
       WHERE c.party_id = ? ORDER BY l.id`
    ).all(partyId);
  }

  // ── Timers ──────────────────────────────────────────────────────────────────

  scheduleTimer({ caseId, kind, dueAt, payload = {}, createdAt }) {
    const id = newId("tmr");
    this.sql(
      "INSERT INTO timers (id, case_id, kind, due_at, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, caseId, kind, dueAt, toJson(payload), createdAt);
    return id;
  }

  /** Cancel pending timers for a case (optionally only some kinds). Returns how many. */
  cancelTimers(caseId, kinds = null) {
    if (!kinds) {
      return Number(this.sql("UPDATE timers SET status = 'cancelled' WHERE case_id = ? AND status = 'pending'").run(caseId).changes);
    }
    let count = 0;
    for (const kind of kinds) {
      count += Number(
        this.sql("UPDATE timers SET status = 'cancelled' WHERE case_id = ? AND kind = ? AND status = 'pending'").run(caseId, kind).changes
      );
    }
    return count;
  }

  dueTimers(nowIso, limit = 50) {
    return this.sql("SELECT * FROM timers WHERE status = 'pending' AND due_at <= ? ORDER BY due_at LIMIT ?")
      .all(nowIso, limit)
      .map(mapTimer);
  }

  /** Atomically claim a timer so it fires exactly once, even with several workers. */
  claimTimer(id) {
    return this.sql("UPDATE timers SET status = 'fired' WHERE id = ? AND status = 'pending'").run(id).changes === 1;
  }

  listTimers(caseId, { pendingOnly = true } = {}) {
    const rows = pendingOnly
      ? this.sql("SELECT * FROM timers WHERE case_id = ? AND status = 'pending' ORDER BY due_at").all(caseId)
      : this.sql("SELECT * FROM timers WHERE case_id = ? ORDER BY due_at").all(caseId);
    return rows.map(mapTimer);
  }

  nextTimerDue() {
    return this.sql("SELECT MIN(due_at) AS due FROM timers WHERE status = 'pending'").get()?.due ?? null;
  }

  // ── Outbox ──────────────────────────────────────────────────────────────────

  /** Enqueue an action. Duplicate idempotency keys are ignored (that's the point). */
  enqueueAction(a) {
    const existing = this.sql("SELECT id FROM outbox WHERE idempotency_key = ?").get(a.idempotencyKey);
    if (existing) return { enqueued: false, id: existing.id };
    const id = newId("act");
    this.sql(
      `INSERT INTO outbox (id, case_id, event_id, idempotency_key, connector, operation, label, payload, meta, status,
         next_attempt_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
    ).run(
      id, orNull(a.caseId), orNull(a.eventId), a.idempotencyKey, a.connector, a.operation, a.label,
      toJson(a.payload), toJson(a.meta), a.notBefore ?? a.createdAt, a.createdAt, a.createdAt
    );
    return { enqueued: true, id };
  }

  dueActions(nowIso, limit = 20) {
    return this.sql(
      "SELECT * FROM outbox WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY next_attempt_at, created_at LIMIT ?"
    )
      .all(nowIso, limit)
      .map(mapAction);
  }

  claimAction(id, nowIso) {
    return (
      this.sql("UPDATE outbox SET status = 'in_flight', attempts = attempts + 1, updated_at = ? WHERE id = ? AND status = 'pending'")
        .run(nowIso, id).changes === 1
    );
  }

  completeAction(id, result, nowIso) {
    this.sql("UPDATE outbox SET status = 'done', result = ?, last_error = NULL, updated_at = ? WHERE id = ?").run(toJson(result), nowIso, id);
  }

  retryAction(id, error, nextAttemptAt, nowIso) {
    this.sql("UPDATE outbox SET status = 'pending', last_error = ?, next_attempt_at = ?, updated_at = ? WHERE id = ?").run(
      error, nextAttemptAt, nowIso, id
    );
  }

  deadLetterAction(id, error, nowIso) {
    this.sql("UPDATE outbox SET status = 'dead', last_error = ?, updated_at = ? WHERE id = ?").run(error, nowIso, id);
  }

  /** After a crash, in-flight actions are returned to the queue (connectors are idempotent). */
  requeueInFlight(nowIso) {
    return Number(this.sql("UPDATE outbox SET status = 'pending', updated_at = ? WHERE status = 'in_flight'").run(nowIso).changes);
  }

  /** Earliest pending action (deferred sends and retries) — used by fast-forward. */
  nextActionDue() {
    return this.sql("SELECT MIN(next_attempt_at) AS due FROM outbox WHERE status = 'pending'").get()?.due ?? null;
  }

  getAction(id) {
    return mapAction(this.sql("SELECT * FROM outbox WHERE id = ?").get(id));
  }

  listActions({ caseId, status, limit = 200 } = {}) {
    let rows;
    if (caseId) rows = this.sql("SELECT * FROM outbox WHERE case_id = ? ORDER BY created_at, rowid LIMIT ?").all(caseId, limit);
    else if (status) rows = this.sql("SELECT * FROM outbox WHERE status = ? ORDER BY created_at DESC LIMIT ?").all(status, limit);
    else rows = this.sql("SELECT * FROM outbox ORDER BY created_at DESC, rowid DESC LIMIT ?").all(limit);
    return rows.map(mapAction);
  }

  /**
   * Outbound messages to a phone/email since a time — for frequency caps.
   * emergency=true counts everything; emergency=false counts only non-emergency messages.
   */
  countMessagesTo(address, sinceIso, { emergency = true } = {}) {
    return Number(
      this.sql(
        `SELECT COUNT(*) AS n FROM outbox WHERE operation IN ('sendSms','sendEmail')
           AND json_extract(payload, '$.to') = ? AND created_at >= ? AND status != 'dead'
           AND (? = 1 OR COALESCE(json_extract(meta, '$.purpose'), '') != 'emergency')`
      ).get(address, sinceIso, emergency ? 1 : 0).n
    );
  }

  countCaseActionsSince(caseId, sinceIso) {
    return Number(this.sql("SELECT COUNT(*) AS n FROM outbox WHERE case_id = ? AND created_at >= ?").get(caseId, sinceIso).n);
  }

  outboxStats() {
    const rows = this.sql("SELECT status, COUNT(*) AS n FROM outbox GROUP BY status").all();
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  }

  // ── Approvals ───────────────────────────────────────────────────────────────

  createApproval({ caseId, reason, summary, approverId = null, actions, requestedAt }) {
    const id = newId("apv");
    this.sql(
      "INSERT INTO approvals (id, case_id, reason, summary, approver_id, actions, requested_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, caseId, reason, summary, orNull(approverId), JSON.stringify(actions), requestedAt);
    return id;
  }

  getApproval(id) {
    return mapApproval(this.sql("SELECT * FROM approvals WHERE id = ?").get(id));
  }

  decideApproval(id, { status, decidedBy, decidedAt, note = null }) {
    return (
      this.sql("UPDATE approvals SET status = ?, decided_by = ?, decided_at = ?, note = ? WHERE id = ? AND status = 'pending'")
        .run(status, decidedBy, decidedAt, note, id).changes === 1
    );
  }

  listApprovals({ status = "pending", caseId } = {}) {
    const rows = caseId
      ? this.sql("SELECT * FROM approvals WHERE case_id = ? ORDER BY requested_at DESC").all(caseId)
      : this.sql("SELECT * FROM approvals WHERE status = ? ORDER BY requested_at").all(status);
    return rows.map(mapApproval);
  }

  pendingApprovalFor(approverId) {
    return mapApproval(
      this.sql("SELECT * FROM approvals WHERE approver_id = ? AND status = 'pending' ORDER BY requested_at DESC LIMIT 1").get(approverId)
    );
  }

  // ── Model ledger ────────────────────────────────────────────────────────────

  recordModelCall(r) {
    this.sql(
      `INSERT INTO model_calls (at, event_id, case_id, task, tier, provider, model, outcome, input_tokens, output_tokens,
         cached_tokens, cost_usd, latency_ms, estimated, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      r.at, orNull(r.eventId), orNull(r.caseId), r.task, r.tier, r.provider, r.model, r.outcome, r.inputTokens ?? 0,
      r.outputTokens ?? 0, r.cachedTokens ?? 0, r.costUsd ?? 0, r.latencyMs ?? 0, r.estimated ? 1 : 0, orNull(r.error)
    );
  }

  listModelCalls({ caseId, limit = 200 } = {}) {
    const rows = caseId
      ? this.sql("SELECT * FROM model_calls WHERE case_id = ? ORDER BY id DESC LIMIT ?").all(caseId, limit)
      : this.sql("SELECT * FROM model_calls ORDER BY id DESC LIMIT ?").all(limit);
    return rows.map(mapModelCall);
  }

  /** Frontier spend since an instant — enforces the daily budget. */
  frontierSpendSince(sinceIso) {
    return Number(
      this.sql("SELECT COALESCE(SUM(cost_usd), 0) AS usd FROM model_calls WHERE tier = 'frontier' AND at >= ?").get(sinceIso).usd
    );
  }

  modelTotals() {
    const rows = this.sql(
      `SELECT tier, outcome, COUNT(*) AS calls, SUM(input_tokens) AS input, SUM(output_tokens) AS output,
         SUM(cached_tokens) AS cached, SUM(cost_usd) AS cost
       FROM model_calls GROUP BY tier, outcome`
    ).all();
    return rows.map((r) => ({
      tier: r.tier,
      outcome: r.outcome,
      calls: Number(r.calls),
      inputTokens: Number(r.input ?? 0),
      outputTokens: Number(r.output ?? 0),
      cachedTokens: Number(r.cached ?? 0),
      costUsd: Number(r.cost ?? 0),
    }));
  }

  // ── Key-value ───────────────────────────────────────────────────────────────

  getKV(key, fallback = null) {
    const row = this.sql("SELECT value FROM kv WHERE key = ?").get(key);
    return row ? JSON.parse(row.value) : fallback;
  }

  setKV(key, value) {
    this.sql(
      "INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    ).run(key, JSON.stringify(value), new Date().toISOString());
  }
}

// ── Row mappers (snake_case rows → camelCase objects with parsed JSON) ─────────

function mapEvent(r) {
  if (!r) return null;
  return {
    id: r.id,
    type: r.type,
    source: r.source,
    idempotencyKey: r.idempotency_key,
    subject: fromJson(r.subject),
    caseId: r.case_id,
    occurredAt: r.occurred_at,
    receivedAt: r.received_at,
    status: r.status,
    attempts: Number(r.attempts),
    error: r.error,
    payload: fromJson(r.payload),
    trace: fromJson(r.trace, null),
  };
}

function mapParty(r) {
  if (!r) return null;
  return {
    id: r.id,
    role: r.role,
    name: r.name,
    phone: r.phone,
    email: r.email,
    propertyId: r.property_id,
    unitId: r.unit_id,
    external: fromJson(r.external),
    attributes: fromJson(r.attributes),
    updatedAt: r.updated_at,
  };
}

function mapProperty(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    kind: r.kind,
    timezone: r.timezone,
    ownerId: r.owner_id,
    attributes: fromJson(r.attributes),
    external: fromJson(r.external),
  };
}

function mapUnit(r) {
  if (!r) return null;
  return {
    id: r.id,
    propertyId: r.property_id,
    label: r.label,
    floor: r.floor,
    aboveUnitId: r.above_unit_id,
    attributes: fromJson(r.attributes),
    external: fromJson(r.external),
  };
}

function mapCase(r) {
  if (!r) return null;
  return {
    id: r.id,
    playbook: r.playbook,
    status: r.status,
    priority: r.priority,
    title: r.title,
    partyId: r.party_id,
    propertyId: r.property_id,
    unitId: r.unit_id,
    facts: fromJson(r.facts),
    summary: r.summary,
    external: fromJson(r.external),
    flags: fromJson(r.flags),
    version: Number(r.version),
    openedAt: r.opened_at,
    updatedAt: r.updated_at,
    closedAt: r.closed_at,
  };
}

function mapTimer(r) {
  if (!r) return null;
  return { id: r.id, caseId: r.case_id, kind: r.kind, dueAt: r.due_at, status: r.status, payload: fromJson(r.payload), createdAt: r.created_at };
}

function mapAction(r) {
  if (!r) return null;
  return {
    id: r.id,
    caseId: r.case_id,
    eventId: r.event_id,
    idempotencyKey: r.idempotency_key,
    connector: r.connector,
    operation: r.operation,
    label: r.label,
    payload: fromJson(r.payload),
    meta: fromJson(r.meta),
    status: r.status,
    attempts: Number(r.attempts),
    nextAttemptAt: r.next_attempt_at,
    lastError: r.last_error,
    result: fromJson(r.result, null),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapApproval(r) {
  if (!r) return null;
  return {
    id: r.id,
    caseId: r.case_id,
    reason: r.reason,
    summary: r.summary,
    approverId: r.approver_id,
    actions: fromJson(r.actions, []),
    status: r.status,
    requestedAt: r.requested_at,
    decidedAt: r.decided_at,
    decidedBy: r.decided_by,
    note: r.note,
  };
}

function mapModelCall(r) {
  return {
    id: r.id,
    at: r.at,
    eventId: r.event_id,
    caseId: r.case_id,
    task: r.task,
    tier: r.tier,
    provider: r.provider,
    model: r.model,
    outcome: r.outcome,
    inputTokens: Number(r.input_tokens),
    outputTokens: Number(r.output_tokens),
    cachedTokens: Number(r.cached_tokens),
    costUsd: Number(r.cost_usd),
    latencyMs: Number(r.latency_ms),
    estimated: Boolean(r.estimated),
    error: r.error,
  };
}
