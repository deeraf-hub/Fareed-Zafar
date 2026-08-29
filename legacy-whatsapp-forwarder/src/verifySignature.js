import crypto from "node:crypto";
import { config } from "./config.js";

/**
 * Verifies Meta's X-Hub-Signature-256 header against the raw request body.
 * Rejecting unsigned/forged payloads is what keeps the webhook endpoint safe
 * to expose on the public internet.
 */
export function isValidSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected = crypto
    .createHmac("sha256", config.appSecret)
    .update(rawBody)
    .digest("hex");

  const received = signatureHeader.slice("sha256=".length);
  if (received.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(received, "utf8"),
    Buffer.from(expected, "utf8")
  );
}
