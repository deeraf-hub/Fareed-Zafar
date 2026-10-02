import { randomUUID, createHash } from "node:crypto";

/** Opaque internal id with a readable prefix, e.g. "evt_3f9c1a2b7d4e". */
export function newId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** Stable short hash — used for idempotency keys and model-response cache keys. */
export function shortHash(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** Normalize a phone number to E.164 (US default). Returns null if it isn't one. */
export function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.length >= 8 ? digits : null;
  const bare = digits.replace(/\D/g, "");
  if (bare.length === 10) return `+1${bare}`;
  if (bare.length === 11 && bare.startsWith("1")) return `+${bare}`;
  return null;
}

/** Lowercase, trimmed email, with any "Name <addr>" wrapper removed. */
export function normalizeEmail(raw) {
  if (!raw) return null;
  const match = String(raw).match(/<([^>]+)>/);
  const email = (match ? match[1] : String(raw)).trim().toLowerCase();
  return email.includes("@") ? email : null;
}
