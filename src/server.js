import express from "express";
import { config } from "./config.js";
import { isValidSignature } from "./verifySignature.js";
import { forwardMessagingEvent } from "./forwarder.js";

const app = express();

// Keep the raw body around — signature verification must run on the exact
// bytes Meta sent, not on re-serialized JSON.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health check for uptime monitors / hosting platforms.
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// Webhook verification handshake (Meta calls this once when you configure
// the webhook in the App Dashboard).
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.verifyToken) {
    console.log("Webhook verified by Meta.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Event delivery.
app.post("/webhook", (req, res) => {
  if (!isValidSignature(req.rawBody, req.get("X-Hub-Signature-256"))) {
    console.warn("Rejected webhook call with bad signature.");
    return res.sendStatus(401);
  }

  // Acknowledge immediately — Meta requires a fast 200 and will retry (and
  // eventually disable the subscription) on slow or failing responses.
  res.sendStatus(200);

  if (req.body.object !== "page") return;

  for (const entry of req.body.entry || []) {
    for (const event of entry.messaging || []) {
      forwardMessagingEvent(event).catch((err) => {
        console.error(`Failed to forward event: ${err.message}`);
      });
    }
  }
});

app.listen(config.port, () => {
  console.log(`Messenger → WhatsApp forwarder listening on port ${config.port}`);
});
