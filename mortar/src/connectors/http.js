import { ConnectorError } from "../core/outbox.js";

/**
 * Shared HTTP helper for live connectors. Classifies failures so the outbox knows
 * whether to retry: network errors, 408, 429 and 5xx are retryable; other 4xx are not.
 * Honors Retry-After on 429 (Follow Up Boss and Twilio both send it).
 */
export async function request(url, { method = "GET", headers = {}, body, timeoutMs = 15000, label = new URL(url).host } = {}) {
  let res;
  try {
    res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new ConnectorError(`${label}: ${err.name === "TimeoutError" ? `timed out after ${timeoutMs} ms` : err.message}`, { retryable: true });
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (res.ok) return { status: res.status, data, headers: res.headers };

  const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
  const retryAfter = res.headers.get("retry-after");
  const detail = typeof data === "object" && data ? JSON.stringify(data).slice(0, 300) : String(text).slice(0, 300);
  const err = new ConnectorError(`${label} HTTP ${res.status}${retryAfter ? ` (retry after ${retryAfter}s)` : ""}: ${detail}`, {
    retryable,
    status: res.status,
  });
  throw err;
}

export const basicAuth = (user, pass = "") => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

export const form = (fields) =>
  new URLSearchParams(Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString();

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
