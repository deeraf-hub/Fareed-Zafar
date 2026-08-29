import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

process.env.APP_SECRET = "test-secret";
process.env.VERIFY_TOKEN = "t";
process.env.PAGE_ACCESS_TOKEN = "t";
process.env.WHATSAPP_TOKEN = "t";
process.env.WHATSAPP_PHONE_NUMBER_ID = "t";
process.env.WHATSAPP_RECIPIENT = "t";

const { isValidSignature } = await import("../src/verifySignature.js");

function sign(body, secret) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

test("accepts a correctly signed payload", () => {
  const body = Buffer.from(JSON.stringify({ object: "page", entry: [] }));
  assert.equal(isValidSignature(body, sign(body, "test-secret")), true);
});

test("rejects a payload signed with the wrong secret", () => {
  const body = Buffer.from("{}");
  assert.equal(isValidSignature(body, sign(body, "wrong-secret")), false);
});

test("rejects a tampered payload", () => {
  const body = Buffer.from("{}");
  const sig = sign(body, "test-secret");
  assert.equal(isValidSignature(Buffer.from("{ }"), sig), false);
});

test("rejects missing or malformed signature headers", () => {
  const body = Buffer.from("{}");
  assert.equal(isValidSignature(body, undefined), false);
  assert.equal(isValidSignature(body, "sha1=abc"), false);
  assert.equal(isValidSignature(body, "sha256=short"), false);
});
