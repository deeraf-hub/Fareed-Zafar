import express from "express";
import { fromFollowUpBoss, fromInboundEmail, fromNormalized, fromTwilioCallStatus, fromTwilioGather, fromTwilioSms, makeEvent } from "../core/events.js";
import { verifyBearer, verifyFubSignature, verifyMortarSignature, verifyTwilioSignature } from "./verify.js";

/**
 * Inbound webhooks. Each route: verify the sender → normalize → persist (dedupe) →
 * acknowledge immediately. Processing is asynchronous, so a provider never waits on
 * a model call and never retries because we were slow.
 *
 *   POST /webhooks/twilio/sms          inbound SMS                     (X-Twilio-Signature)
 *   POST /webhooks/twilio/gather       keypress on a call we placed    (X-Twilio-Signature)
 *   POST /webhooks/twilio/call-status  no-answer / busy / completed    (X-Twilio-Signature)
 *   POST /webhooks/followupboss        CRM changes made by people      (FUB-Signature)
 *   POST /webhooks/showmojo            leads & showings (normalized)   (Bearer token)
 *   POST /events                       anything relayed by n8n         (X-Mortar-Signature)
 *                                      — Rentvine work orders, inbound email, ShowMojo,
 *                                        lead-gen discoveries, outcomes, staff messages
 *   POST /directory/sync               directory data from n8n         (X-Mortar-Signature)
 *                                      — properties, units, people, on-call rota, weather
 */
export function createWebhooks({ getApp, config }) {
  const router = express.Router();
  const raw = express.raw({ type: "*/*", limit: "1mb" });
  const form = express.urlencoded({ extended: false, verify: (req, _res, buf) => (req.rawBody = buf) });
  const now = () => getApp().clock.now().toISOString();
  const ingest = (event) => getApp().ingest(event);

  function twilioGuard(req, res, next) {
    if (!config.security.verifyTwilioSignatures) return next();
    const url = `${config.publicBaseUrl}${req.originalUrl}`;
    const ok = verifyTwilioSignature({ authToken: config.connectors.twilio.authToken, url, params: req.body, signature: req.get("x-twilio-signature") });
    if (!ok) {
      getApp().log.warn("rejected Twilio webhook with a bad signature", { url });
      return res.sendStatus(403);
    }
    next();
  }

  const twiml = (res, inner = "") => res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`);

  router.post("/webhooks/twilio/sms", form, twilioGuard, async (req, res) => {
    await ingest(fromTwilioSms(req.body, now()));
    twiml(res); // no auto-reply here: replies are decided by the pipeline
  });

  router.post("/webhooks/twilio/gather", form, twilioGuard, async (req, res) => {
    await ingest(fromTwilioGather(req.body, req.query, now()));
    twiml(res, `<Say voice="Polly.Joanna">Thank you. Your response has been recorded. Details are on their way by text.</Say>`);
  });

  router.post("/webhooks/twilio/call-status", form, twilioGuard, async (req, res) => {
    await ingest(fromTwilioCallStatus(req.body, req.query, now()));
    res.sendStatus(204);
  });

  router.post("/webhooks/followupboss", raw, async (req, res) => {
    if (!verifyFubSignature(req.body, req.get("fub-signature"), config.connectors.fubWebhookKey)) return res.sendStatus(401);
    const body = JSON.parse(req.body.toString("utf8"));
    for (const event of fromFollowUpBoss({ ...body, stage: body.data?.stage }, now())) await ingest(event);
    res.sendStatus(200); // FUB wants a 2xx within 10 s
  });

  router.post("/webhooks/showmojo", express.json(), async (req, res) => {
    if (!verifyBearer(req.get("authorization"), config.connectors.showmojo.webhookToken)) return res.sendStatus(401);
    await ingest(fromNormalized(req.body, "showmojo", now()));
    res.sendStatus(200);
  });

  router.post("/events", raw, async (req, res) => {
    if (!verifyMortarSignature(req.body, req.get("x-mortar-signature"), config.security.webhookSecret)) return res.sendStatus(401);
    let body;
    try {
      body = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "body is not JSON" });
    }
    try {
      const event =
        body.type && body.idempotencyKey
          ? makeEvent(body)
          : body.event === "email.received"
            ? fromInboundEmail(body, now())
            : fromNormalized(body, body.source ?? "n8n", now());
      const result = await ingest(event);
      res.status(result.duplicate ? 200 : 202).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /** Directory sync: upserts only, in one transaction. Partial bodies are fine (weather alone, rota alone). */
  router.post("/directory/sync", express.raw({ type: "*/*", limit: "5mb" }), (req, res) => {
    if (!verifyMortarSignature(req.body, req.get("x-mortar-signature"), config.security.webhookSecret)) return res.sendStatus(401);
    let body;
    try {
      body = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "body is not JSON" });
    }
    const { store } = getApp();
    const at = now();
    store.tx(() => {
      for (const p of body.properties ?? []) store.upsertProperty(p);
      for (const u of body.units ?? []) store.upsertUnit(u);
      for (const p of body.parties ?? []) store.upsertParty({ ...p, updatedAt: at });
      if (body.lines) store.setKV("lines", body.lines);
      if (body.oncall) store.setKV("oncall", body.oncall);
      if (body.weather && Number.isFinite(Number(body.weather.tempF))) {
        store.setKV("weather", { tempF: Number(body.weather.tempF), observedAt: body.weather.observedAt ?? at, source: body.weather.source ?? "n8n" });
      }
    });
    res.json({ ok: true, properties: body.properties?.length ?? 0, units: body.units?.length ?? 0, parties: body.parties?.length ?? 0, oncall: Boolean(body.oncall), weather: Boolean(body.weather) });
  });

  return router;
}
