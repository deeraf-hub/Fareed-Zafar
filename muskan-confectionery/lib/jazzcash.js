/**
 * JazzCash Hosted Checkout Page (HCP) integration.
 *
 * Builds the pp_* form fields + pp_SecureHash JazzCash expects for its
 * redirect-based Hosted Checkout Page, per JazzCash's Mobile Account /
 * HCP integration guide (HMAC-SHA256 secure hash, Integrity Salt as key).
 *
 * Requires merchant credentials from JazzCash's merchant onboarding:
 *   JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT
 * Field names follow the commonly published HCP v2.0 spec; JazzCash has
 * occasionally revised minor details across integration guide versions —
 * confirm field names/hash formula against the guide your relationship
 * manager provides before going live.
 */
import crypto from "node:crypto";

const SANDBOX_URL = "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";
const LIVE_URL = "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";

export function isJazzCashConfigured() {
  return Boolean(process.env.JAZZCASH_MERCHANT_ID && process.env.JAZZCASH_PASSWORD && process.env.JAZZCASH_INTEGRITY_SALT);
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

function computeSecureHash(fields, integritySalt) {
  const sortedValues = Object.keys(fields)
    .sort()
    .filter((key) => fields[key] !== "" && fields[key] !== undefined && fields[key] !== null)
    .map((key) => fields[key]);
  const hashString = integritySalt + "&" + sortedValues.join("&");
  return crypto.createHmac("sha256", integritySalt).update(hashString).digest("hex").toUpperCase();
}

/**
 * @param {{ orderId: string, amountPkr: number, description: string, returnUrl: string }} order
 * @returns {{ action: string, fields: Record<string, string> }}
 */
export function buildJazzCashCheckout(order) {
  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password = process.env.JAZZCASH_PASSWORD;
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
  const isLive = process.env.JAZZCASH_ENV === "live";

  const now = new Date();
  const expiry = new Date(now.getTime() + 60 * 60 * 1000);

  const fields = {
    pp_Version: "2.0",
    pp_TxnType: "",
    pp_Language: "EN",
    pp_MerchantID: merchantId,
    pp_SubMerchantID: "",
    pp_Password: password,
    pp_BankID: "",
    pp_ProductID: "",
    pp_TxnRefNo: order.orderId,
    pp_Amount: String(Math.round(order.amountPkr * 100)),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: formatDateTime(now),
    pp_BillReference: order.orderId,
    pp_Description: order.description.slice(0, 100),
    pp_TxnExpiryDateTime: formatDateTime(expiry),
    pp_ReturnURL: order.returnUrl,
  };

  fields.pp_SecureHash = computeSecureHash(fields, integritySalt);

  return { action: isLive ? LIVE_URL : SANDBOX_URL, fields };
}

/** Verifies the pp_SecureHash on JazzCash's callback POST before trusting it. */
export function verifyJazzCashResponse(body) {
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
  const { pp_SecureHash, ...rest } = body;
  const expected = computeSecureHash(rest, integritySalt);
  return expected === pp_SecureHash;
}
