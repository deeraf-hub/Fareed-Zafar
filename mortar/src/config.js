/**
 * Runtime configuration, read once from the environment.
 *
 * Everything has a safe default so `npm run demo` works with zero setup:
 * simulated connectors, a simulated clock, and a simulated local model.
 * Point the env vars at real systems to go live — no code changes.
 */

const env = process.env;

/** Empty counts as unset, so a blank line in .env means "use the default". */
const str = (name, fallback = "") => (env[name]?.trim() || fallback).trim();
const num = (name, fallback) => {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (Number.isNaN(value)) throw new Error(`${name} must be a number (got "${raw}")`);
  return value;
};
const json = (name, fallback) => {
  const raw = env[name];
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
};
const bool = (name, fallback) => {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
};

export function loadConfig(argv = process.argv) {
  const demo = argv.includes("--demo") || bool("MORTAR_DEMO", false);
  const connectorDefault = str("CONNECTORS", "simulated");

  return Object.freeze({
    demo,
    port: num("PORT", 4000),
    publicBaseUrl: str("PUBLIC_BASE_URL", "http://localhost:4000"),
    dbPath: str("DB_PATH", demo ? ":memory:" : "./var/mortar.db"),
    timezone: str("TIMEZONE", "America/Chicago"),
    logFormat: str("LOG_FORMAT", demo ? "pretty" : "json"),
    logLevel: str("LOG_LEVEL", "info"),

    // Simulated clock lets the demo "fast-forward" to fire timers (vendor
    // timeouts, escalations, reminders) without waiting in real time.
    clock: {
      simulated: demo || bool("SIMULATED_CLOCK", false),
      start: str("DEMO_START", "2026-10-08T04:28:00Z"), // Wed 11:28 PM in Austin (CDT)
    },

    security: {
      // HMAC secret for events signed by n8n or other internal senders.
      webhookSecret: str("MORTAR_WEBHOOK_SECRET", demo ? "demo-secret" : ""),
      // Bearer token for the console/API. Empty = open (demo only).
      consoleToken: str("CONSOLE_TOKEN", ""),
      verifyTwilioSignatures: bool("VERIFY_TWILIO_SIGNATURES", !demo),
    },

    models: {
      // local  = small open model (Ollama, vLLM, llama.cpp, LM Studio)
      // frontier = Claude, used only where its capability justifies the cost
      local: {
        provider: str("LOCAL_MODEL_PROVIDER", "simulated"), // ollama | openai-compatible | simulated | none
        ollamaUrl: str("OLLAMA_URL", "http://localhost:11434"),
        // Model names are configuration, never code. Unset = first installed / first listed.
        ollamaModel: str("OLLAMA_MODEL", ""),
        openaiCompatUrl: str("OPENAI_COMPAT_URL", "http://localhost:8000"),
        openaiCompatModel: str("OPENAI_COMPAT_MODEL", ""),
        openaiCompatApiKey: str("OPENAI_COMPAT_API_KEY", ""),
      },
      frontier: {
        provider: str(
          "FRONTIER_PROVIDER",
          env.ANTHROPIC_API_KEY ? "anthropic" : demo ? "simulated" : "none"
        ), // anthropic | simulated | none
        // Pin FRONTIER_MODEL in production. Unset = newest model of FRONTIER_MODEL_FAMILY
        // with structured outputs, discovered from the Anthropic Models API at startup.
        model: str("FRONTIER_MODEL", ""),
        family: str("FRONTIER_MODEL_FAMILY", "opus"),
        // USD per 1M tokens — used for the ledger, the daily budget and the naive baseline.
        price: { input: num("FRONTIER_USD_PER_MTOK_IN", 5), output: num("FRONTIER_USD_PER_MTOK_OUT", 25) },
        dailyBudgetUsd: num("FRONTIER_DAILY_BUDGET_USD", 5),
      },
      // Optional second retrieval signal (fused with BM25). Off unless both are set.
      embeddings: { provider: str("EMBEDDINGS_PROVIDER", "none"), model: str("EMBEDDINGS_MODEL", "") }, // ollama | none
      timeoutMs: num("MODEL_TIMEOUT_MS", 30000),
      // After this many consecutive failures a provider is skipped for a cool-down.
      circuitFailures: num("MODEL_CIRCUIT_FAILURES", 3),
      circuitCooldownMs: num("MODEL_CIRCUIT_COOLDOWN_MS", 60000),
    },

    connectors: {
      twilio: {
        mode: str("TWILIO_MODE", connectorDefault),
        accountSid: str("TWILIO_ACCOUNT_SID"),
        authToken: str("TWILIO_AUTH_TOKEN"),
        fromNumber: str("TWILIO_FROM_NUMBER"),
        messagingServiceSid: str("TWILIO_MESSAGING_SERVICE_SID"),
      },
      email: {
        mode: str("EMAIL_MODE", connectorDefault),
        postmarkToken: str("POSTMARK_SERVER_TOKEN"),
        from: str("EMAIL_FROM", "maintenance@example.com"),
      },
      fub: {
        mode: str("FUB_MODE", connectorDefault),
        apiKey: str("FUB_API_KEY"),
        systemName: str("FUB_SYSTEM_NAME", "Mortar"),
        systemKey: str("FUB_SYSTEM_KEY"),
      },
      rentvine: {
        mode: str("RENTVINE_MODE", connectorDefault),
        baseUrl: str("RENTVINE_BASE_URL"), // https://<company>.rentvine.com/api/manager
        apiKey: str("RENTVINE_API_KEY"),
        apiSecret: str("RENTVINE_API_SECRET"),
        // Account-specific ids (GET /maintenance/work-order/statuses).
        priorityIds: json("RENTVINE_PRIORITY_IDS", { P1: 1, P2: 2, P3: 3 }),
        statusIds: json("RENTVINE_STATUS_IDS", { open: 1, in_progress: 2, completed: 3 }),
      },
      showmojo: {
        // ShowMojo pushes leads/showings to a webhook with a Bearer token (no HMAC).
        webhookToken: str("SHOWMOJO_WEBHOOK_TOKEN", demo ? "demo-showmojo-token" : ""),
      },
      fubWebhookKey: str("FUB_SYSTEM_KEY"), // FUB signs webhooks with the X-System-Key
    },

    outbox: {
      pollMs: num("OUTBOX_POLL_MS", 500),
      maxAttempts: num("OUTBOX_MAX_ATTEMPTS", 6),
    },
    scheduler: {
      pollMs: num("SCHEDULER_POLL_MS", 1000),
    },
  });
}
