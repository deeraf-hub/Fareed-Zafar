import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildJazzCashCheckout, isJazzCashConfigured, verifyJazzCashResponse } from "./lib/jazzcash.js";
import { buildEasyPaisaCheckout, isEasyPaisaConfigured, verifyEasyPaisaResponse } from "./lib/easypaisa.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PRODUCTS_FILE = path.join(__dirname, "data", "products.json");
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");
const CONTACTS_FILE = path.join(__dirname, "data", "contacts.json");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for gateway callback POSTs
app.use(express.static(__dirname));

async function readJsonFile(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8"));
  } catch (e) {
    return fallback;
  }
}

async function appendJsonRecord(file, record) {
  const list = await readJsonFile(file, []);
  list.push(record);
  await fs.writeFile(file, JSON.stringify(list, null, 2));
}

function makeOrderId() {
  return "MC" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
}

function baseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

app.get("/healthz", (req, res) => res.json({ ok: true }));

app.post("/api/checkout", async (req, res) => {
  try {
    const { customer, items, paymentMethod } = req.body || {};
    if (!customer?.name || !customer?.phone || !customer?.address || !customer?.city) {
      return res.status(400).json({ error: "Missing customer details." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    const products = await readJsonFile(PRODUCTS_FILE, []);
    let subtotal = 0;
    const orderItems = [];
    for (const line of items) {
      const product = products.find((p) => p.id === line.id);
      if (!product) continue;
      const qty = Math.max(1, Number(line.qty) || 1);
      subtotal += product.price * qty;
      orderItems.push({ id: product.id, name: product.name, price: product.price, qty });
    }
    if (orderItems.length === 0) {
      return res.status(400).json({ error: "No valid items in cart." });
    }

    const delivery = subtotal >= 3000 ? 0 : 150;
    const total = subtotal + delivery;
    const orderId = makeOrderId();

    const order = {
      orderId,
      customer,
      items: orderItems,
      subtotal,
      delivery,
      total,
      paymentMethod,
      status: paymentMethod === "cod" ? "pending_cod" : "pending_payment",
      createdAt: new Date().toISOString(),
    };
    await appendJsonRecord(ORDERS_FILE, order);

    let redirect = null;
    const returnBase = baseUrl(req);

    if (paymentMethod === "jazzcash" && isJazzCashConfigured()) {
      redirect = buildJazzCashCheckout({
        orderId,
        amountPkr: total,
        description: `Muskan Confessionary order ${orderId}`,
        returnUrl: `${returnBase}/api/payment/jazzcash/callback`,
      });
    } else if (paymentMethod === "easypaisa" && isEasyPaisaConfigured()) {
      redirect = buildEasyPaisaCheckout({
        orderId,
        amountPkr: total,
        returnUrl: `${returnBase}/api/payment/easypaisa/callback`,
      });
    }
    // If a wallet method was chosen but no merchant credentials are configured yet,
    // we fall back silently to the manual mobile-account-transfer flow shown on the
    // confirmation page (see checkout.js paymentNote()) rather than failing the order.

    res.json({ orderId, total, redirect });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not place order." });
  }
});

app.post("/api/payment/jazzcash/callback", async (req, res) => {
  const verified = isJazzCashConfigured() && verifyJazzCashResponse(req.body);
  const orderId = req.body?.pp_TxnRefNo;
  const success = verified && req.body?.pp_ResponseCode === "000";

  if (orderId) {
    const orders = await readJsonFile(ORDERS_FILE, []);
    const order = orders.find((o) => o.orderId === orderId);
    if (order) {
      order.status = success ? "paid" : "payment_failed";
      order.gatewayResponse = req.body;
      await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
    }
  }
  res.redirect(`/checkout.html?order=${encodeURIComponent(orderId || "")}&status=${success ? "paid" : "failed"}`);
});

app.post("/api/payment/easypaisa/callback", async (req, res) => {
  const verified = isEasyPaisaConfigured() && verifyEasyPaisaResponse(req.body);
  const orderId = req.body?.orderRefNum;
  const success = verified && (req.body?.status === "0000" || req.body?.status === "0");

  if (orderId) {
    const orders = await readJsonFile(ORDERS_FILE, []);
    const order = orders.find((o) => o.orderId === orderId);
    if (order) {
      order.status = success ? "paid" : "payment_failed";
      order.gatewayResponse = req.body;
      await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
    }
  }
  res.redirect(`/checkout.html?order=${encodeURIComponent(orderId || "")}&status=${success ? "paid" : "failed"}`);
});

app.post("/api/contact", async (req, res) => {
  const { name, phone, message } = req.body || {};
  if (!name || !phone || !message) {
    return res.status(400).json({ error: "Missing name, phone or message." });
  }
  await appendJsonRecord(CONTACTS_FILE, { name, phone, message, receivedAt: new Date().toISOString() });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Muskan Confessionary site running at http://localhost:${PORT}`);
  console.log(`JazzCash gateway configured: ${isJazzCashConfigured()}`);
  console.log(`EasyPaisa gateway configured: ${isEasyPaisaConfigured()}`);
});
