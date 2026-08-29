// Shopping cart logic for Sehrish Builders
// Cart is persisted in localStorage and rendered into the cart drawer markup
// present on every page. No online checkout — customers call to place orders.

const CART_KEY = "sehrishBuildersCart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function addToCart(id, qty = 1) {
  const cart = getCart();
  cart[id] = (cart[id] || 0) + qty;
  saveCart(cart);
  openCart();
}

function setQty(id, qty) {
  const cart = getCart();
  if (qty <= 0) {
    delete cart[id];
  } else {
    cart[id] = qty;
  }
  saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart();
  delete cart[id];
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  renderCart();
}

function cartCount() {
  const cart = getCart();
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

function cartSubtotal() {
  const cart = getCart();
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = PRODUCTS.find((p) => p.id === Number(id));
    return sum + (p ? p.price * qty : 0);
  }, 0);
}

function formatPKR(n) {
  return "PKR " + n.toLocaleString("en-PK");
}

function renderCart() {
  const itemsEl = document.getElementById("cart-items");
  const countEls = document.querySelectorAll(".cart-count");
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalItemsEl = document.getElementById("cart-total-items");
  const emptyEl = document.getElementById("cart-empty");

  const count = cartCount();
  countEls.forEach((el) => {
    el.textContent = count;
    el.classList.toggle("hidden", count === 0);
  });

  if (!itemsEl) return;

  const cart = getCart();
  const entries = Object.entries(cart);

  if (entries.length === 0) {
    itemsEl.innerHTML = "";
    if (emptyEl) emptyEl.classList.remove("hidden");
  } else {
    if (emptyEl) emptyEl.classList.add("hidden");
    itemsEl.innerHTML = entries
      .map(([id, qty]) => {
        const p = PRODUCTS.find((p) => p.id === Number(id));
        if (!p) return "";
        return `
        <div class="flex gap-3 py-4 border-b border-slate-100">
          <img src="${p.image}" alt="${p.name}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-navy-900 text-sm truncate">${p.name}</p>
            <p class="text-xs text-slate-500">${formatPKR(p.price)} ${p.unit}</p>
            <div class="flex items-center gap-2 mt-2">
              <button onclick="setQty(${p.id}, ${qty - 1})" aria-label="Decrease quantity" class="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-navy-900">-</button>
              <span class="text-sm w-6 text-center">${qty}</span>
              <button onclick="setQty(${p.id}, ${qty + 1})" aria-label="Increase quantity" class="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-navy-900">+</button>
              <button onclick="removeFromCart(${p.id})" class="ml-auto text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
            </div>
          </div>
          <p class="font-semibold text-navy-900 text-sm whitespace-nowrap">${formatPKR(p.price * qty)}</p>
        </div>`;
      })
      .join("");
  }

  if (subtotalEl) subtotalEl.textContent = formatPKR(cartSubtotal());
  if (totalItemsEl) totalItemsEl.textContent = count;

  if (window.lucide) lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", renderCart);
