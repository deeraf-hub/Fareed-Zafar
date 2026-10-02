import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyTwilioSignature, verifyMortarSignature, verifyFubSignature, verifyBearer } from "../src/http/verify.js";

// Signature = base64(HMAC-SHA1(authToken, URL + params sorted by name, as name+value)).
test("Twilio signature: valid, tampered, and wrong-token requests", () => {
  const authToken = "12345";
  const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
  const params = { To: "+18005551212", CallSid: "CA1234567890ABCDE", Digits: "1234", From: "+12349013030", Caller: "+12349013030" };
  const signature = createHmac("sha1", authToken)
    .update(`${url}CallSidCA1234567890ABCDECaller+12349013030Digits1234From+12349013030To+18005551212`)
    .digest("base64");
  assert.equal(verifyTwilioSignature({ authToken, url, params, signature }), true);
  assert.equal(verifyTwilioSignature({ authToken, url, params: { ...params, Digits: "9" }, signature }), false, "tampered params fail");
  assert.equal(verifyTwilioSignature({ authToken: "wrong", url, params, signature }), false);
});

test("Twilio signature: tolerates an explicit :443 like Twilio's SDK", () => {
  const authToken = "secret";
  const params = { Body: "1", From: "+15125550111" };
  const sign = (u) => createHmac("sha1", authToken).update(u + "Body1From+15125550111").digest("base64");
  assert.equal(verifyTwilioSignature({ authToken, url: "https://x.example/sms", params, signature: sign("https://x.example:443/sms") }), true);
});

test("Mortar HMAC (n8n → Mortar)", () => {
  const body = Buffer.from(JSON.stringify({ event: "workorder.updated" }));
  const sig = "sha256=" + createHmac("sha256", "s3cret").update(body).digest("hex");
  assert.equal(verifyMortarSignature(body, sig, "s3cret"), true);
  assert.equal(verifyMortarSignature(Buffer.from("{}"), sig, "s3cret"), false);
  assert.equal(verifyMortarSignature(body, undefined, "s3cret"), false);
  assert.equal(verifyMortarSignature(body, sig, ""), false, "no secret configured → reject");
});

test("Follow Up Boss signature is HMAC-SHA256 over the base64 body", () => {
  const raw = Buffer.from('{"eventId":"e1","event":"peopleStageUpdated","resourceIds":[1042]}');
  const sig = createHmac("sha256", "fub-key").update(raw.toString("base64")).digest("hex");
  assert.equal(verifyFubSignature(raw, sig, "fub-key"), true);
  assert.equal(verifyFubSignature(raw, createHmac("sha256", "fub-key").update(raw).digest("hex"), "fub-key"), false, "signing the raw body (not base64) is wrong");
});

test("ShowMojo bearer token", () => {
  assert.equal(verifyBearer("Bearer abc", "abc"), true);
  assert.equal(verifyBearer("Bearer abd", "abc"), false);
  assert.equal(verifyBearer("Bearer abc", ""), false);
});
