/**
 * Sends a test message to WHATSAPP_RECIPIENT so you can verify your
 * WhatsApp Cloud API credentials before wiring up the Messenger webhook.
 *
 * Usage:  npm run test:whatsapp
 */
import { config } from "../src/config.js";
import { sendText } from "../src/whatsapp.js";

console.log(`Sending test message to ${config.whatsappRecipient} ...`);

try {
  const result = await sendText(
    "✅ Messenger → WhatsApp forwarder: your WhatsApp Cloud API credentials work. " +
      "You are ready to connect the Messenger webhook.",
    { templateParams: { senderName: "Forwarder setup", preview: "Credential test" } }
  );
  console.log("Success! Message id:", result.messages?.[0]?.id);
  console.log("Check your WhatsApp — the test message should be there.");
} catch (err) {
  console.error("Test send FAILED:", err.message);
  console.error(
    "\nCommon causes:\n" +
      "  • WHATSAPP_TOKEN expired (dashboard temp tokens last 24h — use a System User token)\n" +
      "  • WHATSAPP_RECIPIENT not added/verified as a recipient of the test number\n" +
      "  • Wrong WHATSAPP_PHONE_NUMBER_ID (use the Phone number ID, not the phone number)\n" +
      "  • 24h window closed and no approved template configured — message your\n" +
      "    business number from your phone once, or set WHATSAPP_TEMPLATE_NAME"
  );
  process.exit(1);
}
