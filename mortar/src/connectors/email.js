import { request } from "./http.js";

/**
 * Outbound email (live) via Postmark's JSON API. Any provider works — this file is
 * the only place that would change. Inbound email arrives through n8n (IMAP / Gmail
 * trigger) or a provider's inbound webhook; see events.fromInboundEmail.
 */
export function postmarkConnector({ serverToken, from }) {
  return {
    async sendEmail({ to, subject, body, replyTo }) {
      const { data } = await request("https://api.postmarkapp.com/email", {
        method: "POST",
        label: "Postmark",
        headers: { "content-type": "application/json", accept: "application/json", "x-postmark-server-token": serverToken },
        body: JSON.stringify({ From: from, To: to, Subject: subject, TextBody: body, ReplyTo: replyTo, MessageStream: "outbound" }),
      });
      return { messageId: data?.MessageID };
    },
  };
}
