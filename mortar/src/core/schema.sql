-- ─────────────────────────────────────────────────────────────────────────────
-- Mortar state store.
--
-- Runs on SQLite locally (zero setup). The same tables port to Postgres / AWS RDS
-- unchanged except TEXT-JSON columns → JSONB. Design rules:
--   • events are append-only and idempotent (unique idempotency_key)
--   • cases hold STRUCTURED state + a short rolling summary — never raw transcripts
--   • actions leave through a transactional outbox (written in the same
--     transaction as the state change), so a crash can't lose or double-send them
--   • every model call is recorded in a ledger (tokens, cost, latency, outcome)
-- ─────────────────────────────────────────────────────────────────────────────

-- Every inbound signal: webhooks, timers, action results, human decisions.
CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,                 -- message.received, timer.fired, action.completed …
  source          TEXT NOT NULL,                 -- twilio, email, rentvine, showmojo, followupboss, n8n, scheduler …
  idempotency_key TEXT NOT NULL UNIQUE,          -- provider id (MessageSid, Message-ID, webhook id) → dedupe
  subject         TEXT NOT NULL DEFAULT '{}',    -- JSON routing hints: {phone}|{email}|{caseId}|{partyId}
  case_id         TEXT,
  occurred_at     TEXT NOT NULL,
  received_at     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'received',  -- received | processed | ignored | failed
  attempts        INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  payload         TEXT NOT NULL,                 -- JSON
  trace           TEXT                           -- JSON: the nine-stage pipeline trace
);
CREATE INDEX IF NOT EXISTS events_status ON events (status, received_at);
CREATE INDEX IF NOT EXISTS events_case   ON events (case_id, received_at);

-- ── Directory: a local read-model of people, properties and units ──────────────
-- Mirrored from Rentvine / Follow Up Boss / ShowMojo (webhooks + periodic sync) so
-- deterministic lookups never wait on a third-party API — or an LLM.

CREATE TABLE IF NOT EXISTS parties (
  id          TEXT PRIMARY KEY,
  role        TEXT NOT NULL,                 -- tenant | owner | vendor | staff | lead | prospect
  name        TEXT NOT NULL,
  phone       TEXT,                          -- E.164
  email       TEXT,                          -- lowercase
  property_id TEXT,
  unit_id     TEXT,
  external    TEXT NOT NULL DEFAULT '{}',    -- {"rentvine":"T-88","fub":1042}
  attributes  TEXT NOT NULL DEFAULT '{}',    -- long-term memory: preferences, consent, trades, features
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS parties_phone ON parties (phone);
CREATE INDEX IF NOT EXISTS parties_email ON parties (email);
CREATE INDEX IF NOT EXISTS parties_role  ON parties (role);

CREATE TABLE IF NOT EXISTS properties (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL,
  kind       TEXT NOT NULL,                  -- single_family | multifamily | condo
  timezone   TEXT NOT NULL,
  owner_id   TEXT,
  attributes TEXT NOT NULL DEFAULT '{}',     -- approval limits, owner prefs, listing details
  external   TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS units (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL,
  label         TEXT NOT NULL,
  floor         INTEGER,
  above_unit_id TEXT,                        -- the unit directly above: water travels down
  attributes    TEXT NOT NULL DEFAULT '{}',
  external      TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS units_property ON units (property_id);

-- ── Cases: one per unit of work ────────────────────────────────────────────────
-- A maintenance issue (MC-…), a rental lead's journey (LS-…), an owner prospect (LG-…).

CREATE TABLE IF NOT EXISTS cases (
  id          TEXT PRIMARY KEY,
  playbook    TEXT NOT NULL,
  status      TEXT NOT NULL,                 -- validated against the playbook's state machine
  priority    TEXT,                          -- P1/P2/P3 (maintenance) · A/B/C (lead tiers)
  title       TEXT NOT NULL,
  party_id    TEXT,
  property_id TEXT,
  unit_id     TEXT,
  facts       TEXT NOT NULL DEFAULT '{}',    -- working memory: typed, structured
  summary     TEXT NOT NULL DEFAULT '',      -- rolling summary rebuilt from facts by code (0 tokens)
  external    TEXT NOT NULL DEFAULT '{}',    -- {"rentvineWorkOrderId":"WO-5512","fubPersonId":1042}
  flags       TEXT NOT NULL DEFAULT '{}',    -- {"humanInControl":true,"legalSensitive":true}
  version     INTEGER NOT NULL DEFAULT 1,    -- optimistic concurrency
  opened_at   TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  closed_at   TEXT
);
CREATE INDEX IF NOT EXISTS cases_party  ON cases (party_id, status);
CREATE INDEX IF NOT EXISTS cases_status ON cases (playbook, status);

-- Append-only, human-readable timeline: episodic memory + audit trail.
CREATE TABLE IF NOT EXISTS case_log (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id  TEXT NOT NULL,
  at       TEXT NOT NULL,
  kind     TEXT NOT NULL,                    -- inbound | outbound | decision | action | state | escalation | approval | model | note
  actor    TEXT NOT NULL,                    -- agent | system | human:<name> | party:<id>
  text     TEXT NOT NULL,
  data     TEXT NOT NULL DEFAULT '{}',
  event_id TEXT
);
CREATE INDEX IF NOT EXISTS case_log_case ON case_log (case_id, id);

-- ── Next actions ───────────────────────────────────────────────────────────────

-- Durable timers survive restarts: "if the vendor hasn't answered by 11:40, call the next one".
CREATE TABLE IF NOT EXISTS timers (
  id         TEXT PRIMARY KEY,
  case_id    TEXT NOT NULL,
  kind       TEXT NOT NULL,
  due_at     TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',   -- pending | fired | cancelled
  payload    TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS timers_due  ON timers (status, due_at);
CREATE INDEX IF NOT EXISTS timers_case ON timers (case_id, status);

-- Transactional outbox. Idempotency keys make every external side effect exactly-once
-- from the business's point of view, even when webhooks are redelivered.
CREATE TABLE IF NOT EXISTS outbox (
  id              TEXT PRIMARY KEY,
  case_id         TEXT,
  event_id        TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  connector       TEXT NOT NULL,             -- twilio | email | rentvine | fub
  operation       TEXT NOT NULL,             -- sendSms | placeCall | createWorkOrder | addNote …
  label           TEXT NOT NULL,             -- human-readable, shown in the console
  payload         TEXT NOT NULL,             -- exactly what the connector receives
  meta            TEXT NOT NULL DEFAULT '{}',-- Mortar-side context: recipient, purpose, notify-on-complete
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | in_flight | done | dead
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,             -- also used to defer non-urgent sends past quiet hours
  last_error      TEXT,
  result          TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS outbox_due  ON outbox (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS outbox_case ON outbox (case_id);

-- Human-in-the-loop: proposed actions that wait for a person.
CREATE TABLE IF NOT EXISTS approvals (
  id           TEXT PRIMARY KEY,
  case_id      TEXT NOT NULL,
  reason       TEXT NOT NULL,
  summary      TEXT NOT NULL,
  approver_id  TEXT,                         -- party who may decide by SMS (owner, PM); console users always can
  actions      TEXT NOT NULL,                -- JSON: the held actions
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  requested_at TEXT NOT NULL,
  decided_at   TEXT,
  decided_by   TEXT,
  note         TEXT
);
CREATE INDEX IF NOT EXISTS approvals_status ON approvals (status, requested_at);

-- ── Observability ──────────────────────────────────────────────────────────────

-- Model ledger: every model call — and every tier deliberately skipped — with cost.
CREATE TABLE IF NOT EXISTS model_calls (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  at            TEXT NOT NULL,
  event_id      TEXT,
  case_id       TEXT,
  task          TEXT NOT NULL,
  tier          TEXT NOT NULL,               -- local | frontier
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  outcome       TEXT NOT NULL,               -- ok | cached | low_confidence | invalid_output | refusal | error | unavailable | over_budget
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd      REAL NOT NULL DEFAULT 0,
  latency_ms    INTEGER NOT NULL DEFAULT 0,
  estimated     INTEGER NOT NULL DEFAULT 0,  -- 1 = token counts are estimates (simulated provider)
  error         TEXT
);
CREATE INDEX IF NOT EXISTS model_calls_at ON model_calls (at);

-- Small key-value store: counters, learned scoring weights, bandit posteriors.
CREATE TABLE IF NOT EXISTS kv (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
