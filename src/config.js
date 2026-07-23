import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  appSecret: required("APP_SECRET"),
  verifyToken: required("VERIFY_TOKEN"),
  pageAccessToken: required("PAGE_ACCESS_TOKEN"),

  whatsappToken: required("WHATSAPP_TOKEN"),
  whatsappPhoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
  whatsappRecipient: required("WHATSAPP_RECIPIENT"),

  templateName: process.env.WHATSAPP_TEMPLATE_NAME || "",
  templateLang: process.env.WHATSAPP_TEMPLATE_LANG || "en",

  timezone: process.env.TIMEZONE || "UTC",
  graphVersion: process.env.GRAPH_API_VERSION || "v21.0",
  port: Number(process.env.PORT) || 3000,
};

export const GRAPH_BASE = `https://graph.facebook.com/${config.graphVersion}`;
