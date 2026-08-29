import { config } from "./config.js";
import { getSenderName } from "./messenger.js";
import {
  sendText,
  sendMediaByLink,
  sendMediaByUpload,
} from "./whatsapp.js";

// Meta redelivers webhook events until they are acknowledged, so the same
// message can arrive more than once. Remember recently seen message ids.
const seenMessageIds = new Set();
const MAX_SEEN = 5000;

function markSeen(mid) {
  seenMessageIds.add(mid);
  if (seenMessageIds.size > MAX_SEEN) {
    // Drop the oldest entries (Set preserves insertion order).
    const iterator = seenMessageIds.values();
    for (let i = 0; i < 1000; i++) seenMessageIds.delete(iterator.next().value);
  }
}

function formatTimestamp(ms) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: config.timezone,
  }).format(new Date(ms));
}

// Messenger attachment type -> WhatsApp message type
const MEDIA_TYPE_MAP = {
  image: "image",
  video: "video",
  audio: "audio", // includes Messenger voice messages
  file: "document",
};

function header(senderName, timestampMs) {
  return `📩 New Messenger message\n👤 From: ${senderName}\n🕒 ${formatTimestamp(timestampMs)}`;
}

async function forwardAttachment(att, caption) {
  const type = MEDIA_TYPE_MAP[att.type];
  const url = att.payload?.url;

  if (att.type === "location" && att.payload?.coordinates) {
    const { lat, long } = att.payload.coordinates;
    await sendText(`${caption}\n📍 Location: https://maps.google.com/?q=${lat},${long}`);
    return;
  }

  if (!type || !url) {
    // Shares, unsupported stickers, "fallback" link previews, etc.
    await sendText(`${caption}\n📎 Attachment (${att.type || "unknown"}): ${url || "no direct URL available"}`);
    return;
  }

  const filename = att.payload?.title || undefined;
  try {
    await sendMediaByLink(type, url, caption);
  } catch (linkErr) {
    console.warn(`Send-by-link failed (${linkErr.message}); retrying via upload.`);
    try {
      await sendMediaByUpload(type, url, caption, filename);
    } catch (uploadErr) {
      // Oversized or unsupported media — deliver the link as text so the
      // message is never silently lost.
      console.warn(`Upload fallback failed (${uploadErr.message}); sending link as text.`);
      await sendText(`${caption}\n📎 Attachment (${att.type}) could not be re-sent directly. Download link (expires after a few days):\n${url}`);
    }
  }
}

/**
 * Handles one messaging event from the Page webhook and mirrors it to
 * WhatsApp. Throwing here is caught by the caller; the webhook is always
 * acknowledged so Meta does not disable the subscription.
 */
export async function forwardMessagingEvent(event) {
  const message = event.message;
  if (!message) return; // delivery/read/postback/etc.
  if (message.is_echo) return; // messages sent BY the page — do not loop
  if (message.mid && seenMessageIds.has(message.mid)) return;
  if (message.mid) markSeen(message.mid);

  const senderName = await getSenderName(event.sender.id);
  const head = header(senderName, event.timestamp || Date.now());
  const templateParams = {
    senderName,
    preview: message.text || `[${message.attachments?.[0]?.type || "attachment"}]`,
  };

  if (message.text) {
    await sendText(`${head}\n\n💬 ${message.text}`, { templateParams });
  }

  for (const att of message.attachments || []) {
    // For a text+attachment message the text already went out above, so the
    // attachment only carries the header as its caption.
    await forwardAttachment(att, head);
  }

  if (!message.text && !(message.attachments || []).length) {
    await sendText(`${head}\n\n(Message had no text or supported attachments.)`, {
      templateParams,
    });
  }

  console.log(`Forwarded message ${message.mid || "(no mid)"} from ${senderName}`);
}
