# Inventory Manager — for your clothing brand

A complete stock-keeping system in **one file**. No installing, no monthly fee,
no account, no internet needed. You double-click it and it opens like a website.

Built for: **Hoodies · Jackets · Cotton Pants · T-Shirts · Bike Jackets ·
Sweat Shirts · Polo T-Shirts** — and anything else you add later.

---

## How to start (60 seconds)

1. Open the `inventory` folder.
2. Double-click **`index.html`**.
   It opens in Chrome / Edge / Safari — whatever browser you already use.
3. A 5-step setup asks for your brand name, what you sell, and your sizes and
   colours. Fill it in and press **Continue** each time.
4. That's it. You are looking at your inventory.

**Tip:** right-click `index.html` → *Send to → Desktop (create shortcut)*, or drag
it onto your browser's bookmarks bar. Then it is one click away every morning.

---

## How you use it every day

| What happened | What you press |
|---|---|
| A delivery arrived from your tailor / factory | **+ Add Stock** |
| You sold something | **+ Record Sale** — stock drops by itself |
| A piece is damaged, gifted, or returned to the supplier | **Stock In / Out → Stock Out** |
| You counted the shelf and the number is wrong | **Stock In / Out** → type the correct number in the box |
| You want to know what to re-order | **Dashboard** → *Needs your attention* |
| Your accountant wants a file | **Reports → Export CSV** (opens in Excel) |

---

## What each tab does

**Dashboard** — your morning screen. Pieces in stock, what your stock is worth,
today's and this month's sales and profit, what is running low, and what moved
recently.

**Products** — the list of everything you sell. Each product carries its own
sizes and colours, cost price, selling price, and supplier. Open one to see
exactly how many are left in every size and colour.

**Stock In / Out** — for stock arriving or leaving *without* a sale. There is
also a full list where you can correct any number directly, plus **−** and **+**
buttons for quick one-piece changes.

**Sales** — every order you recorded, filterable by date, with revenue and
profit. Made a mistake? Press **Undo** and the pieces go back into stock.

**Reports** — a re-order list, your best sellers, and stock value by product
type. Printable, and exportable to Excel.

**Settings** — brand name, currency, low-stock warning level, your sizes,
colours and product types, and **Backup**.

---

## Sizes, colours and SKUs

Every product is split into one row per **size × colour**. A hoodie in 4 sizes
and 3 colours becomes 12 rows, so you always know that you have 2 Black Larges
left — not just "14 hoodies somewhere".

Each row gets a code (SKU) automatically, like:

```
HOO-CPH-L-BLA
 │   │   │  └── colour  (Black)
 │   │   └───── size    (L)
 │   └───────── product (Classic Pullover Hoodie)
 └───────────── type    (Hoodies)
```

You can write these on your labels, or ignore them completely.

---

## ⚠️ Where your data lives — please read

Your products and sales are stored **inside the browser on that one computer**.
They are private (nothing is uploaded anywhere), but that also means:

- Opening the file on a **different computer or phone** shows an empty system.
- **Clearing your browsing data / history** can erase it.
- Using a different browser on the same computer shows a different, empty copy.

**So: once a week press Settings → ⬇️ Download backup** and keep the file in
Google Drive, on a USB stick, or email it to yourself. To move everything to a
new computer, copy `index.html` across, open it, and press
**Settings → ⬆️ Restore from backup**.

---

## Common questions

**Can two people use it at the same time?**
Not on the same live data — each computer keeps its own copy. For one shop and
one person it is perfect. If you later need several staff sharing live numbers,
that needs a hosted version with a login; this file is the right starting point
and its backup file can be imported into that later.

**Does it work on my phone?**
Yes, the layout adapts — but the data on the phone is separate from the data on
your laptop. Pick one device as the real one.

**Can I add a product type that isn't in the list?**
Yes. During setup, or later in **Settings → Product types**.

**Will my prices show in Rupees?**
Yes — PKR is the default. Change it any time in **Settings** (USD, GBP, EUR,
AED, SAR, INR, CAD, AUD are all there).

**I made a mess. Can I start over?**
**Settings → Erase everything and start again.** Download a backup first.

---

## For a developer (you can ignore this)

`index.html` is self-contained: plain JavaScript, no framework, no build step to
run it, no network calls. Data lives in `localStorage` under
`clothing-inventory-v1`.

The Tailwind CSS is compiled and inlined so the page works offline. If you edit
the design classes, rebuild it:

```bash
cd inventory/dev
npm install
npm run build     # re-inlines the CSS into ../index.html
npm test          # 20 end-to-end browser checks against ../index.html
```
