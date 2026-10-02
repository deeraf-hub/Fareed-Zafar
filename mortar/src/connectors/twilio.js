import { basicAuth, form, request } from "./http.js";

/**
 * Twilio (live). SMS via the Messages resource; voice pages/dispatch calls via the
 * Calls resource with inline TwiML: a one-digit <Gather> whose action URL carries our
 * own reference (case id + who/what the call was for), so the keypress comes back
 * as a `call.gather` event that the pipeline can route without guessing.
 *
 * Notes from Twilio's docs that shaped this:
 *  - bodies are form-encoded, not JSON; inline Twiml is capped at 4,000 chars
 *  - Twilio blocks sends to numbers that replied STOP (error 21610) — Mortar keeps
 *    its own consent state as well, so it never tries
 *  - US 10DLC traffic must be on a registered A2P campaign
 */
export function twilioConnector({ accountSid, authToken, fromNumber, messagingServiceSid, publicBaseUrl }) {
  const api = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
  const headers = { authorization: basicAuth(accountSid, authToken), "content-type": "application/x-www-form-urlencoded" };

  return {
    async sendSms({ to, body, from }) {
      const { data } = await request(`${api}/Messages.json`, {
        method: "POST",
        headers,
        label: "Twilio SMS",
        body: form({
          To: to,
          Body: body,
          ...(messagingServiceSid ? { MessagingServiceSid: messagingServiceSid } : { From: from ?? fromNumber }),
        }),
      });
      return { sid: data.sid, status: data.status };
    },

    async placeCall({ to, say, gather, caseId }) {
      const ref = encodeURIComponent(gather?.ref ?? "");
      const action = `${publicBaseUrl}/webhooks/twilio/gather?caseId=${encodeURIComponent(caseId)}&ref=${ref}`;
      const statusCallback = `${publicBaseUrl}/webhooks/twilio/call-status?caseId=${encodeURIComponent(caseId)}&ref=${ref}`;
      const twiml =
        `<Response><Gather input="dtmf" numDigits="1" timeout="8" action="${xml(action)}" method="POST">` +
        `<Say voice="Polly.Joanna">${xml(say)}</Say></Gather>` +
        `<Say voice="Polly.Joanna">We did not receive a response. We will text you the details. Goodbye.</Say></Response>`;
      if (twiml.length > 4000) throw new Error("TwiML exceeds Twilio's 4,000 character limit");

      const { data } = await request(`${api}/Calls.json`, {
        method: "POST",
        headers,
        label: "Twilio call",
        body: form({
          To: to,
          From: fromNumber,
          Twiml: twiml,
          StatusCallback: statusCallback,
          StatusCallbackEvent: "completed",
          Timeout: 25,
        }),
      });
      return { sid: data.sid, status: data.status };
    },
  };
}

const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
