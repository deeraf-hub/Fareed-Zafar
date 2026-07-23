import { config, GRAPH_BASE } from "./config.js";

const MESSAGES_URL = `${GRAPH_BASE}/${config.whatsappPhoneNumberId}/messages`;
const MEDIA_URL = `${GRAPH_BASE}/${config.whatsappPhoneNumberId}/media`;

// Error code Meta returns when a free-form message is sent outside the
// 24-hour customer-service window ("re-engagement message").
const OUTSIDE_WINDOW_ERROR = 131047;

const RETRY_DELAYS_MS = [2000, 4000, 8000];

async function postMessages(payload) {
  const res = await fetch(MESSAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: config.whatsappRecipient,
      ...payload,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      `WhatsApp send failed (HTTP ${res.status}): ${JSON.stringify(body.error || body)}`
    );
    err.metaCode = body?.error?.code;
    err.transient = res.status >= 500 || res.status === 429;
    throw err;
  }
  return body;
}

async function sendWithRetry(payload) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await postMessages(payload);
    } catch (err) {
      lastError = err;
      if (!err.transient || attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}

/**
 * Sends a free-form text message. If Meta rejects it because the 24-hour
 * window is closed (code 131047), falls back to the approved utility
 * template so the notification still reaches the phone.
 */
export async function sendText(text, { templateParams } = {}) {
  try {
    return await sendWithRetry({
      type: "text",
      text: { body: text.slice(0, 4096), preview_url: false },
    });
  } catch (err) {
    if (err.metaCode === OUTSIDE_WINDOW_ERROR && config.templateName) {
      console.warn("24h window closed — falling back to template message.");
      return sendTemplate(templateParams || { senderName: "Messenger", preview: text });
    }
    throw err;
  }
}

export async function sendTemplate({ senderName, preview }) {
  return sendWithRetry({
    type: "template",
    template: {
      name: config.templateName,
      language: { code: config.templateLang },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: String(senderName).slice(0, 200) },
            { type: "text", text: String(preview).slice(0, 500) },
          ],
        },
      ],
    },
  });
}

/**
 * Sends a media message by public link. Messenger attachment URLs are signed
 * CDN links that Meta's WhatsApp servers can fetch directly, which avoids
 * proxying the file through this server in the common case.
 */
export async function sendMediaByLink(kind, link, caption) {
  const media = { link };
  // WhatsApp does not support captions on audio messages.
  if (caption && kind !== "audio") media.caption = caption.slice(0, 1024);
  return sendWithRetry({ type: kind, [kind]: media });
}

/**
 * Fallback path: download the attachment ourselves, upload it to the
 * WhatsApp media endpoint, then send by media id. Used when send-by-link
 * fails (expired CDN URL, unsupported redirect, etc.).
 */
export async function sendMediaByUpload(kind, link, caption, filename) {
  const download = await fetch(link);
  if (!download.ok) {
    throw new Error(`Attachment download failed: HTTP ${download.status}`);
  }
  const contentType =
    download.headers.get("content-type") || "application/octet-stream";
  const blob = await download.blob();

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", contentType);
  form.append("file", blob, filename || "attachment");

  const uploadRes = await fetch(MEDIA_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.whatsappToken}` },
    body: form,
  });
  const uploadBody = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !uploadBody.id) {
    throw new Error(
      `WhatsApp media upload failed (HTTP ${uploadRes.status}): ${JSON.stringify(uploadBody.error || uploadBody)}`
    );
  }

  const media = { id: uploadBody.id };
  if (caption && kind !== "audio") media.caption = caption.slice(0, 1024);
  return sendWithRetry({ type: kind, [kind]: media });
}
