import { z } from "zod";
import { normalizeEmail, normalizePhone, shortHash } from "./ids.js";

/**
 * Every signal entering Mortar — a tenant SMS, a ShowMojo showing, a Rentvine
 * work-order update, a timer, the result of an outbound action — becomes one
 * normalized envelope. Normalizers live here so playbooks never see vendor-specific
 * webhook shapes. The idempotency key is what makes redelivered webhooks harmless.
 *
 * Event catalog (type → payload):
 *   message.received   { channel: sms|email|voice, from, to, text, subject?, autoReply? }
 *   call.gather        { callSid, digits, ref }            IVR keypress ("press 1 to accept")
 *   call.status        { callSid, status, ref }            no-answer | busy | failed | completed
 *   workorder.updated  { workOrderId, status, vendorId?, note? }           (Rentvine)
 *   listing.inquiry    { listingId, prospect{name,phone,email}, message }  (ShowMojo / Zillow via ShowMojo)
 *   showing.scheduled  { showingId, listingId, prospect, startsAt }        (ShowMojo)
 *   showing.completed  { showingId, listingId, prospect }
 *   crm.person.updated { personId, stage?, assignedTo?, by? }               (Follow Up Boss webhook)
 *   prospect.discovered{ source, record }                                    (lead-gen data sources)
 *   outcome.recorded   { caseId, outcome }                                   (won / lost — feeds learning)
 *   human.message      { caseId, by, text }                                  (staff replied directly)
 *   approval.decided   { approvalId, decision, by, note?, edits? }
 *   timer.fired        { timerId, kind, payload }
 *   action.completed   { actionId, connector, operation, result }
 *   action.failed      { actionId, connector, operation, error, dead }
 */

export const EventEnvelope = z.object({
  type: z.string().min(1),
  source: z.string().min(1),
  idempotencyKey: z.string().min(1),
  occurredAt: z.string().min(1),
  subject: z
    .object({
      phone: z.string().optional(),
      email: z.string().optional(),
      caseId: z.string().optional(),
      partyId: z.string().optional(),
    })
    .default({}),
  payload: z.record(z.string(), z.unknown()).default({}),
});

/** Validate and fill defaults; throws a readable error for malformed events. */
export function makeEvent(raw) {
  const parsed = EventEnvelope.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "event"}: ${i.message}`).join("; ");
    throw new Error(`Invalid event: ${issues}`);
  }
  return parsed.data;
}

/** System events (action results) are bookkeeping, not decision points. */
export const isSystemEvent = (type) => type.startsWith("action.");

// ── Normalizers: provider webhook → envelope ───────────────────────────────────

/** Twilio inbound SMS (application/x-www-form-urlencoded). */
export function fromTwilioSms(form, receivedAt) {
  const from = normalizePhone(form.From);
  return makeEvent({
    type: "message.received",
    source: "twilio",
    idempotencyKey: `twilio:${form.MessageSid ?? form.SmsSid}`,
    occurredAt: receivedAt,
    subject: from ? { phone: from } : {},
    payload: {
      channel: "sms",
      from,
      to: normalizePhone(form.To),
      text: String(form.Body ?? "").trim(),
      media: collectTwilioMedia(form),
    },
  });
}

function collectTwilioMedia(form) {
  const count = Number(form.NumMedia ?? 0);
  return Array.from({ length: count }, (_, i) => ({ url: form[`MediaUrl${i}`], type: form[`MediaContentType${i}`] }));
}

/**
 * Twilio <Gather> callback on an outbound call we placed. `ref` is our own reference
 * (dispatch or page id) that we put in the action URL when placing the call.
 * For outbound calls Twilio's `To` is the person we called.
 */
export function fromTwilioGather(form, query, receivedAt) {
  const callee = normalizePhone(form.To);
  return makeEvent({
    type: "call.gather",
    source: "twilio",
    idempotencyKey: `twilio:${form.CallSid}:gather:${form.Digits ?? "none"}`,
    occurredAt: receivedAt,
    subject: query.caseId ? { caseId: String(query.caseId), phone: callee ?? undefined } : callee ? { phone: callee } : {},
    payload: { callSid: form.CallSid, digits: String(form.Digits ?? ""), ref: query.ref ?? null, from: callee },
  });
}

/** Twilio call status callback (no-answer, busy, failed, completed). */
export function fromTwilioCallStatus(form, query, receivedAt) {
  return makeEvent({
    type: "call.status",
    source: "twilio",
    idempotencyKey: `twilio:${form.CallSid}:status:${form.CallStatus}`,
    occurredAt: receivedAt,
    subject: query.caseId ? { caseId: String(query.caseId) } : {},
    payload: { callSid: form.CallSid, status: form.CallStatus, ref: query.ref ?? null, to: normalizePhone(form.To) },
  });
}

/**
 * Inbound email. Accepts the shape n8n produces from IMAP/Gmail triggers
 * ({ messageId, from, to, subject, text, headers }) as well as Postmark's inbound JSON.
 */
export function fromInboundEmail(body, receivedAt) {
  const messageId = body.messageId ?? body.MessageID ?? shortHash(body);
  const from = normalizeEmail(body.from ?? body.FromFull?.Email ?? body.From);
  const headers = normalizeHeaders(body.headers ?? body.Headers);
  const text = String(body.strippedText ?? body.StrippedTextReply ?? body.text ?? body.TextBody ?? "").trim();
  return makeEvent({
    type: "message.received",
    source: "email",
    idempotencyKey: `email:${messageId}`,
    occurredAt: body.date ?? body.Date ? new Date(body.date ?? body.Date).toISOString() : receivedAt,
    subject: from ? { email: from } : {},
    payload: {
      channel: "email",
      from,
      to: normalizeEmail(body.to ?? body.To),
      subject: String(body.subject ?? body.Subject ?? ""),
      text,
      autoReply: isAutoReply(headers),
      bounced: /mailer-daemon|postmaster/i.test(from ?? ""),
    },
  });
}

function normalizeHeaders(headers) {
  if (!headers) return {};
  if (Array.isArray(headers)) return Object.fromEntries(headers.map((h) => [String(h.Name ?? h.name).toLowerCase(), h.Value ?? h.value]));
  return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
}

/** RFC 3834 + common vendor headers. Deterministic — no model needed to spot an out-of-office. */
export function isAutoReply(headers) {
  const autoSubmitted = String(headers["auto-submitted"] ?? "").toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return true;
  if (headers["x-autoreply"] || headers["x-autorespond"]) return true;
  return /^(auto_reply|bulk|junk|list)$/i.test(String(headers.precedence ?? ""));
}

/**
 * Rentvine and ShowMojo events arrive through n8n (see /n8n), which maps each
 * vendor's notification into this small normalized shape before signing it.
 */
export function fromNormalized(body, source, receivedAt) {
  const subject = {};
  const phone = normalizePhone(body.prospect?.phone ?? body.phone);
  const email = normalizeEmail(body.prospect?.email ?? body.email);
  if (phone) subject.phone = phone;
  if (email) subject.email = email;
  if (body.caseId) subject.caseId = body.caseId;
  return makeEvent({
    type: body.event,
    source,
    idempotencyKey: `${source}:${body.id ?? shortHash(body)}`,
    occurredAt: body.occurredAt ?? receivedAt,
    subject,
    payload: body,
  });
}

/**
 * Follow Up Boss webhooks carry resource ids, not the resource:
 * { eventId, event: "peopleStageUpdated", resourceIds: [1042], uri }.
 * One envelope per person; the playbook reads current values from FUB (or the
 * webhook relay includes them).
 */
export function fromFollowUpBoss(body, receivedAt) {
  const ids = body.resourceIds ?? [];
  return ids.map((personId) =>
    makeEvent({
      type: "crm.person.updated",
      source: "followupboss",
      idempotencyKey: `fub:${body.eventId}:${personId}`,
      occurredAt: body.eventCreated ?? receivedAt,
      subject: {},
      payload: { personId, fubEvent: body.event, stage: body.stage ?? null, by: body.by ?? null },
    })
  );
}
