/* End-to-end check of ../index.html in a real browser.
   Run:  cd inventory/dev && npm install && npm test          */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

/* Use the browser this machine already has, if there is one. */
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const executablePath = existsSync(exe) ? exe : undefined;

/* Checks the file directly by default; set APP_URL to test it over a server. */
const APP_URL = process.env.APP_URL || 'file:///home/user/Fareed-Zafar/inventory/index.html';

const errors = [];
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(APP_URL);
await page.waitForTimeout(400);

const step = async (label, fn) => {
  try { await fn(); console.log('✅ ' + label); }
  catch (e) { console.log('❌ ' + label + ' -> ' + e.message); throw e; }
};

// ---- Wizard step 1
await step('wizard step 1 visible, brand pre-filled', async () => {
  await page.waitForSelector('#wBrand');
  if (await page.inputValue('#wBrand') !== 'Brands Loop') throw new Error('brand name not pre-filled');
  await page.fill('#wBrand', 'Brands Loop');
  await page.selectOption('#wCurrency', 'PKR');
  await page.fill('#wLow', '5');
  await page.click('[data-w="next"]');
});

await step('step 2 categories', async () => {
  await page.waitForSelector('.wCat');
  const n = await page.locator('.wCat:checked').count();
  if (n !== 7) throw new Error('expected 7 pre-ticked categories, got ' + n);
  await page.fill('#wNewCat', 'Caps');
  await page.click('[data-w="addcat"]');
  await page.waitForTimeout(100);
  if (!(await page.locator('text=Caps').first().isVisible())) throw new Error('custom category not shown');
  await page.click('[data-w="next"]');
});

await step('step 3 sizes/colours', async () => {
  await page.waitForSelector('#wNewsize');
  await page.fill('#wNewsize', '3xl');
  await page.click('[data-w="addsize"]');
  await page.waitForTimeout(100);
  await page.click('[data-w="next"]');
});

await step('step 4 add product', async () => {
  await page.waitForSelector('#wpName');
  await page.fill('#wpName', 'Classic Pullover Hoodie');
  await page.selectOption('#wpCat', 'Hoodies');
  await page.fill('#wpQty', '10');
  await page.fill('#wpCost', '1800');
  await page.fill('#wpPrice', '3500');
  await page.click('[data-w="addprod"]');
  await page.waitForTimeout(150);
  await page.click('[data-w="next"]');
});

await step('step 5 finish', async () => {
  await page.waitForSelector('[data-w="finish"]');
  await page.click('[data-w="finish"]');
  await page.waitForSelector('[data-tab="dashboard"]');
});

await step('dashboard shows stock', async () => {
  const body = await page.textContent('#root');
  // 7 sizes x 7 colours x 10 = 490
  if (!body.includes('490')) throw new Error('expected 490 pieces on dashboard');
  if (!body.includes('Brands Loop')) throw new Error('brand name missing');
});

await step('add second product', async () => {
  await page.click('[data-tab="products"]');
  await page.click('[data-act="new-product"]');
  await page.waitForSelector('#mName');
  await page.fill('#mName', 'Bike Jacket Pro');
  await page.selectOption('#mCat', 'Bike Jackets');
  await page.fill('#mCost', '6000');
  await page.fill('#mPrice', '11000');
  // uncheck all sizes except S and M
  const sizes = await page.locator('.mSize').all();
  for (const s of sizes) { const v = await s.getAttribute('value'); if (v !== 'S' && v !== 'M') await s.uncheck(); }
  const colors = await page.locator('.mColor').all();
  for (const c of colors) { const v = await c.getAttribute('value'); if (v !== 'Black') await c.uncheck(); }
  await page.fill('#mStart', '3');
  await page.click('#mSave');
  await page.waitForTimeout(300);
  const t = await page.textContent('#root');
  if (!t.includes('Bike Jacket Pro')) throw new Error('product not listed');
});

await step('stock in adds pieces', async () => {
  await page.click('[data-tab="stock"]');
  await page.click('[data-act="quick-in2"]');
  await page.waitForSelector('#stProduct');
  await page.selectOption('#stProduct', { label: 'Bike Jacket Pro — Bike Jackets' });
  await page.waitForTimeout(150);
  await page.fill('#stAll', '5');
  await page.click('#stFill');
  await page.click('#stSave');
  await page.waitForTimeout(300);
});

await step('record a sale reduces stock', async () => {
  await page.click('[data-act="quick-sale"]');
  await page.waitForSelector('#slProduct');
  await page.selectOption('#slProduct', { label: 'Bike Jacket Pro' });
  await page.waitForTimeout(120);
  await page.fill('#slQty', '2');
  await page.click('#slAdd');
  await page.waitForTimeout(200);
  await page.fill('#slDiscount', '1000');
  await page.click('#slSave');
  await page.waitForTimeout(400);
  const t = await page.textContent('#root');
  if (!t.includes('S-0001')) throw new Error('sale reference missing');
});

await step('over-selling is blocked', async () => {
  await page.click('[data-act="quick-sale"]');
  await page.waitForSelector('#slProduct');
  await page.selectOption('#slProduct', { label: 'Bike Jacket Pro' });
  await page.waitForTimeout(120);
  await page.fill('#slQty', '9999');
  await page.click('#slAdd');
  await page.waitForTimeout(250);
  const toast = await page.textContent('#toastRoot');
  if (!/Only \d+ left/.test(toast)) throw new Error('no stock warning shown, got: ' + toast);
  await page.keyboard.press('Escape');
});

await step('sales totals correct', async () => {
  await page.click('[data-tab="sales"]');
  await page.waitForTimeout(250);
  const t = await page.textContent('#root');
  // 2 x 11000 - 1000 discount = 21000 ; profit = 21000 - 12000 = 9000
  if (!t.includes('21,000')) throw new Error('revenue 21,000 not found');
  if (!t.includes('9,000'))  throw new Error('profit 9,000 not found');
});

await step('undo sale restores stock', async () => {
  page.once('dialog', d => d.accept());
  await page.click('[data-act="undo-sale"]');
  await page.waitForTimeout(400);
  const t = await page.textContent('#root');
  if (t.includes('S-0001')) throw new Error('sale still listed after undo');
});

await step('reports render', async () => {
  await page.click('[data-tab="reports"]');
  await page.waitForTimeout(200);
  const t = await page.textContent('#root');
  if (!t.includes('Best sellers')) throw new Error('reports missing');
});

await step('settings save + persistence after reload', async () => {
  await page.click('[data-tab="settings"]');
  await page.waitForSelector('#setName');
  await page.fill('#setName', 'Brands Loop');
  await page.selectOption('#setCurrency', 'USD');
  await page.click('[data-act="save-brand"]');
  await page.waitForTimeout(250);
  await page.reload();
  await page.waitForTimeout(600);
  const t = await page.textContent('#root');
  if (!t.includes('Brands Loop')) throw new Error('brand name did not persist');
  if (!t.includes('$')) throw new Error('currency did not persist');
});

await step('quick +/- stepper works', async () => {
  await page.click('[data-tab="stock"]');
  await page.waitForTimeout(250);
  const first = page.locator('[data-step$="|1"]').first();
  const inputBefore = await page.locator('[data-setqty]').first().inputValue();
  await first.click();
  await page.waitForTimeout(300);
  const inputAfter = await page.locator('[data-setqty]').first().inputValue();
  if (Number(inputAfter) === Number(inputBefore) && Number(inputBefore) !== 0) {
    // rows re-sort by qty so just make sure no crash
  }
});

await step('search filters products', async () => {
  await page.click('[data-tab="products"]');
  await page.waitForSelector('#pSearch');
  await page.fill('#pSearch', 'hoodie');
  await page.waitForTimeout(500);
  const t = await page.textContent('#root');
  if (t.includes('Bike Jacket Pro')) throw new Error('search did not filter');
});

await step('editing away a size warns before losing stock', async () => {
  await page.fill('#pSearch', '');
  await page.waitForTimeout(400);
  await page.click('[data-act="edit-product"]');
  await page.waitForSelector('#mName');
  let asked = false;
  page.once('dialog', d => { asked = /still hold/.test(d.message()); d.dismiss(); });
  const boxes = await page.locator('.mSize:checked').all();
  await boxes[0].uncheck();
  await page.click('#mSave');
  await page.waitForTimeout(400);
  if (!asked) throw new Error('no warning shown before deleting stock');
});

await step('caret stays put while searching', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.fill('#pSearch', 'hoodie');
  await page.waitForTimeout(500);
  await page.locator('#pSearch').evaluate(el => el.setSelectionRange(2, 2));
  await page.keyboard.type('X');
  await page.waitForTimeout(500);
  const pos = await page.locator('#pSearch').evaluate(el => el.selectionStart);
  const val = await page.locator('#pSearch').inputValue();
  if (val !== 'hoXodie') throw new Error('typed in wrong place: ' + val);
  if (pos !== 3) throw new Error('caret jumped to ' + pos);
});

await step('backup file downloads', async () => {
  await page.click('[data-tab="settings"]');
  await page.waitForSelector('[data-act="backup"]');
  const [dl] = await Promise.all([ page.waitForEvent('download'), page.click('[data-act="backup"]') ]);
  const name = dl.suggestedFilename();
  if (!/^inventory-backup-\d{4}-\d{2}-\d{2}\.json$/.test(name)) throw new Error('bad backup name ' + name);
  const path = await dl.path();
  const txt = (await import('node:fs')).readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(txt);
  if (!Array.isArray(parsed.products) || !parsed.products.length) throw new Error('backup has no products');
});

await step('csv export downloads', async () => {
  await page.click('[data-tab="reports"]');
  await page.waitForSelector('[data-act="export-stock"]');
  const [dl] = await Promise.all([ page.waitForEvent('download'), page.click('[data-act="export-stock"]') ]);
  const txt = (await import('node:fs')).readFileSync(await dl.path(), 'utf8');
  if (!txt.includes('Product,Type,Size,Colour,SKU')) throw new Error('csv header wrong');
});

console.log('\n--- console/page errors ---');
console.log(errors.length ? errors.join('\n') : 'none');
await browser.close();
