import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook authenticity checks. Every inbound endpoint verifies its sender before the
 * event is accepted — a forged "vendor accepted" or "owner approved" must be impossible.
 */

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a ?? ""));
  const y = Buffer.from(String(b ?? ""));
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Twilio X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted params as name+value)).
 * `url` must be the exact public URL Twilio called, including the query string.
 * Repeated keys: each value appended (sorted). Twilio's SDK also accepts the URL with
 * and without an explicit :443/:80 port, so we do the same.
 */
export function verifyTwilioSignature({ authToken, url, params, signature }) {
  if (!authToken || !signature) return false;
  const data = Object.keys(params)
    .sort()
    .map((key) => {
      const values = Array.isArray(params[key]) ? [...new Set(params[key])].sort() : [params[key]];
      return values.map((v) => `${key}${v ?? ""}`).join("");
    })
    .join("");
  const candidates = new Set([url, withPort(url), withoutPort(url)]);
  return [...candidates].some((u) => safeEqual(createHmac("sha1", authToken).update(u + data).digest("base64"), signature));
}

// Built by hand: the URL class silently drops default ports when serializing.
function withPort(u) {
  const url = new URL(u);
  if (url.port) return u;
  return `${url.protocol}//${url.hostname}:${url.protocol === "https:" ? 443 : 80}${url.pathname}${url.search}`;
}

function withoutPort(u) {
  const url = new URL(u);
  return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}${url.search}`;
}

/** Events signed by n8n (or any internal sender): X-Mortar-Signature: sha256=<hex HMAC of the raw body>. */
export function verifyMortarSignature(rawBody, header, secret) {
  if (!secret || !header?.startsWith("sha256=")) return false;
  return safeEqual(header.slice(7), createHmac("sha256", secret).update(rawBody).digest("hex"));
}

/** Follow Up Boss FUB-Signature: hex HMAC-SHA256 of base64(raw body), keyed with the X-System-Key. */
export function verifyFubSignature(rawBody, header, systemKey) {
  if (!systemKey || !header) return false;
  const expected = createHmac("sha256", systemKey).update(Buffer.from(rawBody).toString("base64")).digest("hex");
  return safeEqual(header, expected);
}

/** ShowMojo's leads/showings webhook sends a static Bearer token. */
export function verifyBearer(header, token) {
  if (!token) return false;
  return safeEqual(header, `Bearer ${token}`);
}
