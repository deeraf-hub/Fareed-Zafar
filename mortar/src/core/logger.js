/**
 * Structured logger. JSON lines in production (ship to CloudWatch / Loki / Datadog),
 * readable one-liners in the demo. Every line can carry event/case ids so a single
 * incident can be followed across webhooks, model calls, and outbound actions.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const COLORS = { debug: "\x1b[90m", info: "\x1b[36m", warn: "\x1b[33m", error: "\x1b[31m" };
const RESET = "\x1b[0m";

export function createLogger({ level = "info", format = "json", base = {}, sink = process.stdout } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  function write(lvl, msg, fields = {}) {
    if (LEVELS[lvl] < threshold) return;
    const record = { t: new Date().toISOString(), level: lvl, msg, ...base, ...fields };
    if (format === "pretty") {
      const extras = Object.entries({ ...base, ...fields })
        .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(" ");
      sink.write(`${COLORS[lvl]}${lvl.padEnd(5)}${RESET} ${msg}${extras ? `  \x1b[90m${extras}${RESET}` : ""}\n`);
    } else {
      sink.write(JSON.stringify(record) + "\n");
    }
  }

  return {
    debug: (msg, fields) => write("debug", msg, fields),
    info: (msg, fields) => write("info", msg, fields),
    warn: (msg, fields) => write("warn", msg, fields),
    error: (msg, fields) => write("error", msg, fields),
    child: (fields) => createLogger({ level, format, base: { ...base, ...fields }, sink }),
  };
}

/** A logger that discards everything — used by tests. */
export const silentLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return silentLogger;
  },
};
