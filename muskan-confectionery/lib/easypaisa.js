/**
 * EasyPaisa "Easypay" redirect (Type-A) integration.
 *
 * Builds the form fields EasyPaisa's hosted payment page expects, with a
 * merchantHashedReq signature (HMAC-SHA256 of the sorted request params,
 * Base64-encoded, keyed with the merchant Hash Key) per EasyPaisa's
 * published Easypay integration guide.
 *
 * Requires merchant credentials from Telenor Microfinance Bank / EasyPaisa
 * onboarding: EASYPAISA_STORE_ID, EASYPAISA_HASH_KEY
 * EasyPaisa's exact field set/hash formula has varied by merchant contract
 * and API revision — confirm against the integration guide your account
 * manager provides before going live.
 */
import crypto from "node:crypto";

const SANDBOX_URL = "https://easypaystg.easypaisa.com.pk/easypay/Index.jsf";
const LIVE_URL = "https://easypay.easypaisa.com.pk/easypay/Index.jsf";

export function isEasyPaisaConfigured() {
  return Boolean(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDateTime(date) {
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function computeHashedReq(fields, hashKey) {
  const query = Object.keys(fields)
    .sort()
    .filter((key) => fields[key] !== "" && fields[key] !== undefined && fields[key] !== null)
    .map((key) => `${key}=${fields[key]}`)
    .join("&");
  return crypto.createHmac("sha256", hashKey).update(query).digest("base64");
}

/**
 * @param {{ orderId: string, amountPkr: number, returnUrl: string }} order
 * @returns {{ action: string, fields: Record<string, string> }}
 */
export function buildEasyPaisaCheckout(order) {
  const storeId = process.env.EASYPAISA_STORE_ID;
  const hashKey = process.env.EASYPAISA_HASH_KEY;
  const isLive = process.env.EASYPAISA_ENV === "live";

  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const fields = {
    storeId,
    amount: order.amountPkr.toFixed(1),
    postBackURL: order.returnUrl,
    orderRefNum: order.orderId,
    expiryDate: formatDateTime(expiry),
    autoRedirect: "1",
    paymentMethod: "",
  };

  fields.merchantHashedReq = computeHashedReq(fields, hashKey);

  return { action: isLive ? LIVE_URL : SANDBOX_URL, fields };
}

/** Recomputes merchantHashedReq on EasyPaisa's callback POST to confirm it wasn't tampered with. */
export function verifyEasyPaisaResponse(body) {
  const hashKey = process.env.EASYPAISA_HASH_KEY;
  const { merchantHashedReq, ...rest } = body;
  const expected = computeHashedReq(rest, hashKey);
  return expected === merchantHashedReq;
}
