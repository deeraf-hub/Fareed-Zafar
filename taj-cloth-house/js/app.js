/* New Taj Cloth House — storefront UI logic (vanilla JS, no build step). */

const STORE = {
  phoneDisplay: '0346-2493123',
  phoneIntl: '923462493123',
  address: 'A-90/1, Frontier Colony, Kikar Midan, Banaras, Karachi',
  freeDeliveryThreshold: 3000
};

const state = {
  gender: 'all',
  type: 'all',
  search: '',
  sort: 'featured',
  visibleCount: 12
};

const PAGE_SIZE = 12;

/* ---------- wishlist (lightweight, id-only, persisted separately from cart) ---------- */
const WISHLIST_KEY = 'tajClothHouseWishlist_v1';
const Wishlist = {
  ids: [],
  load() {
    try { this.ids = JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; } catch (e) { this.ids = []; }
    return this.ids;
  },
  save() {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(this.ids)); } catch (e) { /* storage unavailable */ }
    const el = document.getElementById('wishlist-count');
    if (el) el.textContent = this.ids.length;
  },
  has(id) { return this.ids.includes(id); },
  toggle(id) {
    this.ids = this.has(id) ? this.ids.filter(x => x !== id) : [...this.ids, id];
    this.save();
  }
};
Wishlist.load();

/* ---------- helpers ---------- */
function formatPrice(n) {
  return 'Rs. ' + Math.round(n).toLocaleString('en-PK');
}

/* Generated product/category art: a brand-gradient panel + a Font Awesome glyph.
   Guarantees the visual always matches the category — no stock-photo lookup, so
   nothing can render the wrong thing. */
function artHTML(icon, gradient, size = 'text-6xl') {
  const [from, to] = gradient;
  return `
    <div class="art-panel" style="background:linear-gradient(135deg, ${from}, ${to})">
      <i class="fa-solid ${icon} ${size} text-cream/90"></i>
    </div>`;
}

/* Real photo layered over the generated art panel. The art panel renders first as a
   permanent fallback; the photo sits on top and removes itself on error, revealing
   the icon underneath instead of a broken-image icon. */
function mediaHTML(image, icon, gradient, alt = '', size = 'text-6xl') {
  return `
    ${artHTML(icon, gradient, size)}
    ${image ? `<img src="${image}" alt="${alt}" loading="lazy" class="absolute inset-0 w-full h-full object-cover" onerror="this.remove()">` : ''}`;
}

function starsHTML(rating) {
  const full = Math.round(rating);
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<i class="fa-star ${i <= full ? 'fa-solid' : 'fa-regular'}"></i>`;
  }
  return html;
}

function toast(message, icon = 'fa-circle-check') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<i class="fa-solid ${icon} text-gold"></i><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

/* ---------- filtering / sorting ---------- */
function getFilteredProducts() {
  let list = PRODUCTS.filter(p => {
    if (state.gender !== 'all' && p.gender !== state.gender) return false;
    if (state.type !== 'all' && p.type !== state.type) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.categoryLabel.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  switch (state.sort) {
    case 'price-low': list = list.slice().sort((a, b) => a.price - b.price); break;
    case 'price-high': list = list.slice().sort((a, b) => b.price - a.price); break;
    case 'rating': list = list.slice().sort((a, b) => b.rating - a.rating); break;
    default: break;
  }
  return list;
}

function setFilters(gender, type) {
  state.gender = gender;
  state.type = type;
  state.visibleCount = PAGE_SIZE;
  syncPillActiveStates();
  renderProducts();
  document.getElementById('shop').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function syncPillActiveStates() {
  document.querySelectorAll('.filter-pill').forEach(btn => {
    const match = btn.dataset.gender === state.gender && btn.dataset.type === state.type;
    btn.dataset.active = match ? 'true' : 'false';
  });
}

/* ---------- rendering: product grid ---------- */
function productCardHTML(p) {
  const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const strike = p.originalPrice ? `<span class="text-navy/35 line-through text-xs ml-2">${formatPrice(p.originalPrice)}</span>` : '';
  let badgeHTML = '';
  if (p.badge === 'Sale') badgeHTML = `<span class="badge-pill badge-sale">-${discount}%</span>`;
  else if (p.badge === 'New') badgeHTML = `<span class="badge-pill badge-new">New</span>`;
  else if (p.badge === 'Bestseller') badgeHTML = `<span class="badge-pill badge-trending">Trending</span>`;
  return `
  <div class="product-card" data-aos="fade-up">
    <div class="card-img-wrap">
      ${mediaHTML(p.image, p.icon, p.gradient, p.name)}
      ${badgeHTML}
      <button class="wishlist-btn" data-active="${Wishlist.has(p.id)}" aria-label="Add to wishlist" onclick="toggleWishlist(${p.id}, this)"><i class="fa-solid fa-heart text-sm"></i></button>
      <button class="quickview-pill" onclick="openQuickView(${p.id})">Quick view</button>
    </div>
    <div class="pt-3">
      <p class="text-[11px] uppercase tracking-wide text-navy/40 font-medium mb-0.5">${p.categoryLabel}</p>
      <h3 class="font-semibold text-sm leading-snug line-clamp-2 mb-1 cursor-pointer" onclick="openQuickView(${p.id})">${p.name}</h3>
      <div class="flex items-center gap-1 mb-1.5"><span class="stars">${starsHTML(p.rating)}</span><span class="text-[11px] text-navy/40">${p.rating} (${p.reviews})</span></div>
      <div class="flex items-center flex-wrap mb-3"><span class="font-bold text-navy">${formatPrice(p.price)}</span>${strike}</div>
      <button class="add-to-cart-btn" onclick="quickAdd(${p.id})">Add to cart +</button>
    </div>
  </div>`;
}

function toggleWishlist(id, btn) {
  Wishlist.toggle(id);
  btn.dataset.active = Wishlist.has(id) ? 'true' : 'false';
}
window.toggleWishlist = toggleWishlist;

function renderProducts() {
  const all = getFilteredProducts();
  const visible = all.slice(0, state.visibleCount);
  const grid = document.getElementById('product-grid');
  grid.innerHTML = visible.map(productCardHTML).join('');

  document.getElementById('result-count').textContent = `${all.length} product${all.length === 1 ? '' : 's'}`;
  document.getElementById('empty-state').classList.toggle('hidden', all.length !== 0);
  document.getElementById('load-more').classList.toggle('hidden', state.visibleCount >= all.length);

  if (window.AOS) AOS.refreshHard();
}

/* ---------- categories ---------- */
function renderCategories() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = CATEGORY_META.map(c => `
    <div class="category-card" data-aos="zoom-in" onclick="setFilters('${c.filterGender}','${c.filterType}')">
      ${mediaHTML(c.image, c.icon, c.gradient, c.title, 'text-7xl')}
      <div class="overlay">
        <div class="w-full">
          <h3 class="text-cream font-display font-800 text-2xl">${c.title}</h3>
          <p class="text-cream/70 text-sm mb-3">${c.subtitle}</p>
          <span class="inline-block bg-navy text-cream text-xs font-semibold px-4 py-2 rounded-full">${c.shopLabel}</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ---------- quick view ---------- */
let qvState = { product: null, size: null, color: null, qty: 1 };

function openQuickView(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  qvState = { product: p, size: p.sizes[0], color: p.colors[0], qty: 1 };
  renderQuickView();
  document.getElementById('quickview-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeQuickView() {
  document.getElementById('quickview-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function renderQuickView() {
  const p = qvState.product;
  const strike = p.originalPrice ? `<span class="text-navy/35 line-through text-base ml-2">${formatPrice(p.originalPrice)}</span>` : '';
  document.getElementById('quickview-modal').innerHTML = `
    <button class="icon-btn absolute top-4 right-4 bg-white z-10" onclick="closeQuickView()"><i class="fa-solid fa-xmark"></i></button>
    <div class="grid md:grid-cols-2 gap-0">
      <div class="relative w-full h-72 md:h-full">${mediaHTML(p.image, p.icon, p.gradient, p.name, 'text-7xl')}</div>
      <div class="p-6 sm:p-8">
        <p class="text-xs uppercase tracking-wide text-gold-dark font-semibold mb-1">${p.categoryLabel}</p>
        <h2 class="font-display font-700 text-2xl mb-2">${p.name}</h2>
        <div class="flex items-center gap-2 mb-4"><span class="stars">${starsHTML(p.rating)}</span><span class="text-xs text-navy/40">${p.rating} (${p.reviews} reviews)</span></div>
        <div class="mb-4"><span class="font-bold text-2xl text-navy">${formatPrice(p.price)}</span>${strike}</div>
        <p class="text-sm text-navy/60 mb-6">${p.description}</p>

        <div class="mb-5">
          <p class="text-xs font-semibold uppercase tracking-wide mb-2">Size</p>
          <div class="flex flex-wrap gap-2" id="qv-sizes">
            ${p.sizes.map(s => `<button class="size-chip" data-active="${s === qvState.size}" onclick="qvSetSize('${s}')">${s}</button>`).join('')}
          </div>
        </div>

        <div class="mb-6">
          <p class="text-xs font-semibold uppercase tracking-wide mb-2">Colour</p>
          <div class="flex flex-wrap gap-2" id="qv-colors">
            ${p.colors.map(c => `<button class="color-chip" data-active="${c === qvState.color}" onclick="qvSetColor('${c}')">${c}</button>`).join('')}
          </div>
        </div>

        <div class="flex items-center gap-4 mb-6">
          <p class="text-xs font-semibold uppercase tracking-wide">Qty</p>
          <div class="flex items-center gap-2">
            <button class="qty-btn" onclick="qvSetQty(-1)"><i class="fa-solid fa-minus text-xs"></i></button>
            <span id="qv-qty" class="w-6 text-center font-semibold">${qvState.qty}</span>
            <button class="qty-btn" onclick="qvSetQty(1)"><i class="fa-solid fa-plus text-xs"></i></button>
          </div>
        </div>

        <button class="btn-gold w-full justify-center" onclick="addFromQuickView()"><i class="fa-solid fa-bag-shopping mr-2"></i>Add to Cart</button>
      </div>
    </div>
  `;
}

function qvSetSize(s) { qvState.size = s; renderQuickView(); }
function qvSetColor(c) { qvState.color = c; renderQuickView(); }
function qvSetQty(delta) { qvState.qty = Math.max(1, Math.min(99, qvState.qty + delta)); renderQuickView(); }

function addFromQuickView() {
  Cart.add(qvState.product, qvState.size, qvState.color, qvState.qty);
  toast(`Added "${qvState.product.name}" to your bag`);
  closeQuickView();
  openCart();
}

function quickAdd(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  Cart.add(p, p.sizes[0], p.colors[0], 1);
  toast(`Added "${p.name}" to your bag`);
}
window.openQuickView = openQuickView;
window.closeQuickView = closeQuickView;
window.qvSetSize = qvSetSize;
window.qvSetColor = qvSetColor;
window.qvSetQty = qvSetQty;
window.addFromQuickView = addFromQuickView;
window.quickAdd = quickAdd;
window.setFilters = setFilters;

/* ---------- cart drawer ---------- */
function openCart() {
  renderCart();
  document.getElementById('cart-overlay').classList.remove('hidden');
  document.getElementById('cart-drawer').classList.add('drawer-open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cart-overlay').classList.add('hidden');
  document.getElementById('cart-drawer').classList.remove('drawer-open');
  document.body.style.overflow = '';
}

function cartLineHTML(item) {
  return `
  <div class="flex gap-3 items-start">
    <div class="relative w-16 h-20 rounded-lg overflow-hidden shrink-0">${mediaHTML(item.image, item.icon, item.gradient, item.name, 'text-2xl')}</div>
    <div class="flex-1 min-w-0">
      <p class="font-semibold text-sm line-clamp-1">${item.name}</p>
      <p class="text-xs text-navy/45 mb-1.5">${item.size ? 'Size ' + item.size : ''}${item.size && item.color ? ' · ' : ''}${item.color || ''}</p>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <button class="qty-btn" onclick="cartChangeQty('${item.lineId}',-1)"><i class="fa-solid fa-minus text-[10px]"></i></button>
          <span class="w-5 text-center text-sm font-semibold">${item.qty}</span>
          <button class="qty-btn" onclick="cartChangeQty('${item.lineId}',1)"><i class="fa-solid fa-plus text-[10px]"></i></button>
        </div>
        <span class="font-semibold text-sm">${formatPrice(item.price * item.qty)}</span>
      </div>
    </div>
    <button class="text-navy/30 hover:text-pop" aria-label="Remove" onclick="cartRemove('${item.lineId}')"><i class="fa-solid fa-trash text-sm"></i></button>
  </div>`;
}

function renderCart() {
  const items = Cart.items;
  document.getElementById('cart-items').innerHTML = items.map(cartLineHTML).join('');
  document.getElementById('cart-empty').classList.toggle('hidden', items.length !== 0);
  document.getElementById('cart-items').classList.toggle('hidden', items.length === 0);

  const subtotal = Cart.subtotal();
  document.getElementById('cart-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('cart-count').textContent = Cart.count();
  document.getElementById('cart-mini-total').textContent = formatPrice(subtotal);

  const remaining = STORE.freeDeliveryThreshold - subtotal;
  const note = document.getElementById('free-delivery-note');
  const bar = document.getElementById('free-delivery-bar');
  if (remaining > 0 && subtotal > 0) {
    note.innerHTML = `Add <strong>${formatPrice(remaining)}</strong> more for free Karachi delivery 🚚`;
  } else if (subtotal > 0) {
    note.innerHTML = `🎉 You've unlocked free Karachi delivery!`;
  } else {
    note.innerHTML = `Free delivery in Karachi on orders above ${formatPrice(STORE.freeDeliveryThreshold)}`;
  }
  bar.style.width = Math.min(100, (subtotal / STORE.freeDeliveryThreshold) * 100) + '%';

  document.getElementById('checkout-btn').disabled = items.length === 0;
  document.getElementById('checkout-btn').classList.toggle('opacity-40', items.length === 0);
}

function cartChangeQty(lineId, delta) {
  const item = Cart.items.find(i => i.lineId === lineId);
  if (!item) return;
  Cart.setQty(lineId, item.qty + delta);
}
function cartRemove(lineId) { Cart.remove(lineId); toast('Item removed from bag', 'fa-trash'); }
window.openCart = openCart;
window.closeCart = closeCart;
window.cartChangeQty = cartChangeQty;
window.cartRemove = cartRemove;

document.addEventListener('cart:updated', () => {
  document.getElementById('cart-count').textContent = Cart.count();
  document.getElementById('cart-mini-total').textContent = formatPrice(Cart.subtotal());
  if (document.getElementById('cart-drawer').classList.contains('drawer-open')) {
    renderCart();
  }
});

/* ---------- checkout ---------- */
const checkoutState = { step: 'details', name: '', phone: '', address: STORE.address, notes: '', method: 'cod', txnId: '', orderId: '' };

function openCheckout() {
  if (Cart.items.length === 0) return;
  checkoutState.step = 'details';
  closeCart();
  document.getElementById('checkout-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  renderCheckout();
}
function closeCheckout() {
  document.getElementById('checkout-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}
window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;

function stepIndicator(active) {
  const steps = [['details', 'Details'], ['payment', 'Payment'], ['review', 'Review']];
  return `<div class="flex items-center gap-2 mb-6">
    ${steps.map(([key, label], i) => `
      <div class="flex items-center gap-2 ${i < steps.length - 1 ? 'flex-1' : ''}">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${key === active ? 'bg-navy text-cream' : 'bg-navy/10 text-navy/50'}">${i + 1}</div>
        <span class="text-xs font-medium ${key === active ? 'text-navy' : 'text-navy/40'} hidden sm:inline">${label}</span>
        ${i < steps.length - 1 ? '<div class="flex-1 h-px bg-navy/10"></div>' : ''}
      </div>`).join('')}
  </div>`;
}

function renderCheckout() {
  const body = document.getElementById('checkout-body');
  const title = document.getElementById('checkout-title');

  if (checkoutState.step === 'success') {
    title.textContent = 'Order Received!';
    body.innerHTML = `
      <div class="text-center py-6">
        <div class="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 text-3xl"><i class="fa-solid fa-check"></i></div>
        <h3 class="font-display font-700 text-xl mb-2">Thank you, ${checkoutState.name.split(' ')[0] || 'there'}!</h3>
        <p class="text-sm text-navy/60 mb-1">Order <strong>#${checkoutState.orderId}</strong> was sent to New Taj Cloth House on WhatsApp.</p>
        <p class="text-sm text-navy/60 mb-6">We'll confirm your order shortly. If WhatsApp didn't open automatically, tap below.</p>
        <a href="${buildWhatsAppLink()}" target="_blank" rel="noopener" class="btn-gold justify-center w-full mb-3"><i class="fa-brands fa-whatsapp mr-2"></i>Open WhatsApp</a>
        <button class="btn-outline-navy justify-center w-full" onclick="closeCheckout()">Continue Shopping</button>
      </div>`;
    return;
  }

  title.textContent = 'Checkout';
  const subtotal = Cart.subtotal();

  if (checkoutState.step === 'details') {
    body.innerHTML = `
      ${stepIndicator('details')}
      <form id="checkout-form-details" class="space-y-4">
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide">Full Name</label>
          <input required name="name" value="${checkoutState.name}" placeholder="Your name" class="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold">
        </div>
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide">Phone Number</label>
          <input required name="phone" value="${checkoutState.phone}" placeholder="03XX-XXXXXXX" class="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold">
        </div>
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide">Delivery Address</label>
          <textarea required name="address" rows="2" placeholder="House / Street, Area, City" class="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold">${checkoutState.address}</textarea>
        </div>
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide">Order Notes (optional)</label>
          <input name="notes" value="${checkoutState.notes}" placeholder="e.g. call before delivery" class="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold">
        </div>
        <button type="submit" class="btn-gold w-full justify-center mt-2">Continue to Payment <i class="fa-solid fa-arrow-right ml-2"></i></button>
      </form>`;
    document.getElementById('checkout-form-details').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      checkoutState.name = f.get('name').trim();
      checkoutState.phone = f.get('phone').trim();
      checkoutState.address = f.get('address').trim();
      checkoutState.notes = f.get('notes').trim();
      checkoutState.step = 'payment';
      renderCheckout();
    });
    return;
  }

  if (checkoutState.step === 'payment') {
    const methods = [
      { key: 'jazzcash', label: 'JazzCash', icon: 'fa-mobile-screen-button', color: 'text-red-600' },
      { key: 'easypaisa', label: 'EasyPaisa', icon: 'fa-mobile-screen-button', color: 'text-green-600' },
      { key: 'cod', label: 'Cash on Delivery', icon: 'fa-money-bill-wave', color: 'text-navy' }
    ];
    body.innerHTML = `
      ${stepIndicator('payment')}
      <div class="space-y-3 mb-5">
        ${methods.map(m => `
          <button type="button" class="w-full flex items-center gap-3 border-2 rounded-xl px-4 py-3.5 text-left transition-colors ${checkoutState.method === m.key ? 'border-navy bg-navy/5' : 'border-navy/10'}" onclick="setPaymentMethod('${m.key}')">
            <i class="fa-solid ${m.icon} ${m.color} text-lg"></i>
            <span class="font-medium text-sm flex-1">${m.label}</span>
            ${checkoutState.method === m.key ? '<i class="fa-solid fa-circle-check text-gold"></i>' : ''}
          </button>`).join('')}
      </div>

      <div id="payment-detail-panel">${paymentDetailPanelHTML()}</div>

      <div class="flex gap-3 mt-6">
        <button class="btn-outline-navy flex-1 justify-center" onclick="checkoutState.step='details';renderCheckout()"><i class="fa-solid fa-arrow-left mr-2"></i>Back</button>
        <button class="btn-gold flex-1 justify-center" onclick="goToReview()">Review Order <i class="fa-solid fa-arrow-right ml-2"></i></button>
      </div>`;
    return;
  }

  if (checkoutState.step === 'review') {
    body.innerHTML = `
      ${stepIndicator('review')}
      <div class="space-y-4 text-sm mb-6">
        <div class="bg-white border border-navy/10 rounded-xl p-4">
          <p class="font-semibold mb-1">${checkoutState.name}</p>
          <p class="text-navy/60">${checkoutState.phone}</p>
          <p class="text-navy/60">${checkoutState.address}</p>
          ${checkoutState.notes ? `<p class="text-navy/45 text-xs mt-1">Note: ${checkoutState.notes}</p>` : ''}
        </div>
        <div class="bg-white border border-navy/10 rounded-xl p-4 max-h-40 overflow-y-auto space-y-2">
          ${Cart.items.map(i => `<div class="flex justify-between"><span class="text-navy/70">${i.name} × ${i.qty}</span><span class="font-medium">${formatPrice(i.price * i.qty)}</span></div>`).join('')}
        </div>
        <div class="flex justify-between font-bold text-base"><span>Total</span><span>${formatPrice(subtotal)}</span></div>
        <div class="bg-gold/10 border border-gold/30 rounded-xl p-3 text-xs">
          Paying via <strong>${methodLabel(checkoutState.method)}</strong>${checkoutState.txnId ? ` · Txn ID: ${checkoutState.txnId}` : ''}
        </div>
      </div>
      <div class="flex gap-3">
        <button class="btn-outline-navy flex-1 justify-center" onclick="checkoutState.step='payment';renderCheckout()"><i class="fa-solid fa-arrow-left mr-2"></i>Back</button>
        <button class="btn-gold flex-1 justify-center" onclick="placeOrder()"><i class="fa-brands fa-whatsapp mr-2"></i>Place Order</button>
      </div>`;
  }
}

function methodLabel(key) {
  return key === 'jazzcash' ? 'JazzCash' : key === 'easypaisa' ? 'EasyPaisa' : 'Cash on Delivery';
}

function paymentDetailPanelHTML() {
  if (checkoutState.method === 'cod') {
    return `<p class="text-xs text-navy/55 bg-white border border-navy/10 rounded-xl p-4">Pay in cash when your order is delivered to your doorstep.</p>`;
  }
  const label = methodLabel(checkoutState.method);
  return `
    <div class="bg-white border border-navy/10 rounded-xl p-4 text-sm space-y-2">
      <p>Send <strong>${formatPrice(Cart.subtotal())}</strong> via <strong>${label}</strong> to:</p>
      <p class="font-display text-lg font-700 text-navy">${STORE.phoneDisplay}</p>
      <p class="text-xs text-navy/50">Account title: New Taj Cloth House</p>
      <div class="pt-2">
        <label class="text-xs font-semibold uppercase tracking-wide">Transaction ID</label>
        <input id="txn-input" value="${checkoutState.txnId}" placeholder="e.g. 8842211903" class="mt-1 w-full rounded-xl border border-navy/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold" oninput="checkoutState.txnId=this.value">
        <p class="text-[11px] text-navy/40 mt-1">We'll verify your payment and confirm the order on WhatsApp.</p>
      </div>
    </div>`;
}

function setPaymentMethod(key) {
  checkoutState.method = key;
  if (key === 'cod') checkoutState.txnId = '';
  renderCheckout();
}
window.setPaymentMethod = setPaymentMethod;

function goToReview() {
  if (checkoutState.method !== 'cod' && checkoutState.txnId.trim().length < 4) {
    toast('Please enter your transaction ID to continue', 'fa-triangle-exclamation');
    return;
  }
  checkoutState.step = 'review';
  renderCheckout();
}
window.goToReview = goToReview;

function buildWhatsAppLink() {
  const lines = [
    `*New Order — New Taj Cloth House*`,
    `Order ID: ${checkoutState.orderId}`,
    ``,
    `*Customer:* ${checkoutState.name}`,
    `*Phone:* ${checkoutState.phone}`,
    `*Address:* ${checkoutState.address}`,
    checkoutState.notes ? `*Notes:* ${checkoutState.notes}` : null,
    ``,
    `*Items:*`,
    ...Cart.items.map(i => `- ${i.name} (${i.size || 'N/A'}${i.color ? ', ' + i.color : ''}) × ${i.qty} = ${formatPrice(i.price * i.qty)}`),
    ``,
    `*Total:* ${formatPrice(Cart.subtotal())}`,
    `*Payment Method:* ${methodLabel(checkoutState.method)}${checkoutState.txnId ? ' (Txn ID: ' + checkoutState.txnId + ')' : ''}`
  ].filter(Boolean).join('\n');
  return `https://wa.me/${STORE.phoneIntl}?text=${encodeURIComponent(lines)}`;
}

function placeOrder() {
  checkoutState.orderId = 'NTCH' + Math.floor(100000 + Math.random() * 900000);
  window.open(buildWhatsAppLink(), '_blank', 'noopener');
  checkoutState.step = 'success';
  renderCheckout();
  Cart.clear();
}
window.placeOrder = placeOrder;

/* ---------- testimonials ---------- */
const TESTIMONIALS = [
  { name: 'Ayesha K.', initials: 'AK', text: "Ordered a lawn suit for Eid and the fabric quality blew me away. Fast delivery too!", rating: 5 },
  { name: 'Hamza R.', initials: 'HR', text: "Finally a store with proper Peshawari chappal sizes. Comfortable and durable.", rating: 5 },
  { name: 'Sana M.', initials: 'SM', text: "Paid via EasyPaisa, order confirmed on WhatsApp within minutes. Super easy checkout.", rating: 4 },
  { name: 'Bilal A.', initials: 'BA', text: "Bought sneakers for my son — great price, great quality, will order again.", rating: 5 },
  { name: 'Fatima N.', initials: 'FN', text: "Love the range for kids. The frocks are adorable and true to size.", rating: 5 },
  { name: 'Usman T.', initials: 'UT', text: "Cash on delivery worked perfectly. Shirt fit was exactly as described.", rating: 4 }
];

function renderTestimonials() {
  const track = document.getElementById('testimonial-track');
  track.innerHTML = TESTIMONIALS.map(t => `
    <div class="testimonial-card">
      <span class="stars mb-3 inline-block">${starsHTML(t.rating)}</span>
      <p class="text-sm text-cream/80 mb-4">"${t.text}"</p>
      <div class="flex items-center gap-3">
        <span class="avatar-circle">${t.initials}</span>
        <span class="text-sm font-semibold text-cream">${t.name}</span>
      </div>
    </div>`).join('');

  let idx = 0;
  setInterval(() => {
    const card = track.querySelector('.testimonial-card');
    if (!card) return;
    const step = card.offsetWidth + 24;
    idx = (idx + 1) % TESTIMONIALS.length;
    track.style.transform = `translateX(-${idx * step}px)`;
    if (idx === 0) setTimeout(() => { track.style.transition = 'none'; track.style.transform = 'translateX(0)'; requestAnimationFrame(() => track.style.transition = ''); }, 700);
  }, 3800);
}

/* ---------- instagram strip ---------- */
function renderInstaGrid() {
  document.getElementById('insta-grid').innerHTML = CATEGORY_META.map(c => `
    <a href="#" class="relative block aspect-square rounded-xl overflow-hidden group">
      ${mediaHTML(c.image, c.icon, c.gradient, c.title, 'text-5xl')}
      <span class="absolute inset-0 bg-navy/0 group-hover:bg-navy/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <i class="fa-brands fa-instagram text-white text-xl"></i>
      </span>
    </a>`).join('');
}

/* ---------- FAQ ---------- */
const FAQS = [
  { q: 'What payment methods do you accept?', a: 'We accept JazzCash, EasyPaisa and Cash on Delivery. For JazzCash/EasyPaisa, send payment to our number and enter the transaction ID at checkout — your order is then confirmed with us on WhatsApp.' },
  { q: 'Do you deliver outside Karachi?', a: 'Currently we deliver across Karachi with same/next-day dispatch. For other cities, message us on WhatsApp and we\'ll arrange courier delivery.' },
  { q: 'What is your return / exchange policy?', a: 'Unused items with tags can be exchanged within 3 days of delivery. Message us on WhatsApp with your order ID to start an exchange.' },
  { q: 'How do I know my size?', a: 'Each product page lists available sizes. If unsure, message us your measurements on WhatsApp and we\'ll help you pick the right fit.' }
];
function renderFAQ() {
  document.getElementById('faq-list').innerHTML = FAQS.map((f, i) => `
    <div class="faq-item" data-open="false" id="faq-${i}">
      <button class="faq-question" onclick="toggleFAQ(${i})">
        <span>${f.q}</span>
        <i class="fa-solid fa-chevron-down faq-chevron text-navy/40"></i>
      </button>
      <div class="faq-answer">${f.a}</div>
    </div>`).join('');
}
function toggleFAQ(i) {
  const el = document.getElementById(`faq-${i}`);
  el.dataset.open = el.dataset.open === 'true' ? 'false' : 'true';
}
window.toggleFAQ = toggleFAQ;

/* ---------- misc UI wiring ---------- */
function initUI() {
  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('wishlist-count').textContent = Wishlist.ids.length;

  window.addEventListener('scroll', () => {
    document.getElementById('site-header').classList.toggle('shadow-soft', window.scrollY > 10);
    const btt = document.getElementById('back-to-top');
    if (window.scrollY > 500) { btt.classList.remove('hidden'); btt.classList.add('flex'); }
    else { btt.classList.add('hidden'); btt.classList.remove('flex'); }
  });
  document.getElementById('back-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  document.getElementById('search-toggle').addEventListener('click', () => {
    document.getElementById('search-bar').classList.toggle('hidden');
    document.getElementById('search-input').focus();
  });
  document.getElementById('search-input').addEventListener('input', e => {
    state.search = e.target.value;
    state.visibleCount = PAGE_SIZE;
    renderProducts();
  });

  document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  });

  document.querySelectorAll('[data-nav-filter]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const v = el.dataset.navFilter;
      document.getElementById('mobile-menu').classList.add('hidden');
      if (v === 'footwear') setFilters('all', 'footwear');
      else setFilters(v, 'all');
    });
  });

  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => setFilters(btn.dataset.gender, btn.dataset.type));
  });

  document.getElementById('sort-select').addEventListener('change', e => {
    state.sort = e.target.value;
    renderProducts();
  });

  document.getElementById('load-more').addEventListener('click', () => {
    state.visibleCount += PAGE_SIZE;
    renderProducts();
  });

  document.getElementById('cart-toggle').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);
  document.getElementById('checkout-btn').addEventListener('click', openCheckout);

  document.getElementById('quickview-overlay').addEventListener('click', e => {
    if (e.target.id === 'quickview-overlay') closeQuickView();
  });
  document.getElementById('checkout-close').addEventListener('click', closeCheckout);
  document.getElementById('checkout-overlay').addEventListener('click', e => {
    if (e.target.id === 'checkout-overlay') closeCheckout();
  });

  document.getElementById('newsletter-btn').addEventListener('click', () => {
    const email = document.getElementById('newsletter-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('Please enter a valid email address', 'fa-triangle-exclamation');
      return;
    }
    toast("Thanks! We'll notify you of new drops 🎉");
    document.getElementById('newsletter-email').value = '';
  });
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  if (window.AOS) AOS.init({ duration: 600, once: true });
  renderCategories();
  renderProducts();
  renderCart();
  renderTestimonials();
  renderInstaGrid();
  renderFAQ();
  initUI();
});
