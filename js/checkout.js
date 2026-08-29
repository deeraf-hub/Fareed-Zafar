// Checkout page: order summary, payment method selection, confirmation.
// No online payment is processed on this static site — JazzCash/EasyPaisa
// payments are sent manually by the customer and verified by the business;
// nothing here is transmitted anywhere automatically.

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderCheckoutSummary() {
  const emptyEl = document.getElementById("checkout-empty");
  const contentEl = document.getElementById("checkout-content");
  const confirmationEl = document.getElementById("checkout-confirmation");
  if (!emptyEl || !contentEl) return;

  // Once an order has been confirmed, don't flip back to the empty state
  // just because the cart was cleared.
  if (!confirmationEl.classList.contains("hidden")) return;

  const cart = getCart();
  const entries = Object.entries(cart);

  if (entries.length === 0) {
    emptyEl.classList.remove("hidden");
    contentEl.classList.add("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  contentEl.classList.remove("hidden");

  document.getElementById("checkout-items").innerHTML = entries
    .map(([id, qty]) => {
      const p = PRODUCTS.find((p) => p.id === Number(id));
      if (!p) return "";
      return `
      <div class="flex gap-3 py-3 border-b border-slate-100">
        <img src="${p.image}" alt="${p.name}" class="w-14 h-14 rounded-lg object-cover flex-shrink-0">
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-navy-900 text-sm truncate">${p.name}</p>
          <p class="text-xs text-slate-500">${qty} x ${formatPKR(p.price)} ${p.unit}</p>
        </div>
        <p class="font-semibold text-navy-900 text-sm whitespace-nowrap">${formatPKR(p.price * qty)}</p>
      </div>`;
    })
    .join("");

  document.getElementById("checkout-total-items").textContent = cartCount();
  document.getElementById("checkout-subtotal").textContent = formatPKR(cartSubtotal());
}

function selectPaymentMethod(method) {
  document.querySelectorAll(".payment-option").forEach((el) => {
    const active = el.dataset.method === method;
    el.classList.toggle("border-navy-900", active);
    el.classList.toggle("ring-2", active);
    el.classList.toggle("ring-navy-900", active);
    el.classList.toggle("border-slate-200", !active);
  });
  document.querySelectorAll(".payment-details").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.method !== method);
  });
  const radio = document.getElementById(`radio-${method}`);
  if (radio) radio.checked = true;

  const txnWrap = document.getElementById("txn-id-wrap");
  if (txnWrap) txnWrap.classList.toggle("hidden", method === "cod");
}

function getSelectedPaymentMethod() {
  const checked = document.querySelector('input[name="payment-method"]:checked');
  return checked ? checked.value : "jazzcash";
}

function placeOrder(event) {
  event.preventDefault();

  const name = document.getElementById("customer-name").value.trim();
  const phone = document.getElementById("customer-phone").value.trim();
  const address = document.getElementById("customer-address").value.trim();
  const notes = document.getElementById("customer-notes").value.trim();
  const method = getSelectedPaymentMethod();
  const txnField = document.getElementById("txn-id");
  const txnId = method !== "cod" && txnField ? txnField.value.trim() : "";

  if (!name || !phone || !address) {
    document.getElementById("checkout-error").classList.remove("hidden");
    return;
  }
  document.getElementById("checkout-error").classList.add("hidden");

  const methodLabel = { jazzcash: "JazzCash", easypaisa: "EasyPaisa", cod: "Cash on Delivery" }[method];
  const cart = getCart();
  const entries = Object.entries(cart);

  document.getElementById("confirmation-details").innerHTML = `
    <div class="space-y-1.5 text-sm">
      <p><span class="text-slate-500">Name:</span> <span class="font-medium text-navy-900">${escapeHtml(name)}</span></p>
      <p><span class="text-slate-500">Phone:</span> <span class="font-medium text-navy-900">${escapeHtml(phone)}</span></p>
      <p><span class="text-slate-500">Address:</span> <span class="font-medium text-navy-900">${escapeHtml(address)}</span></p>
      ${notes ? `<p><span class="text-slate-500">Notes:</span> <span class="font-medium text-navy-900">${escapeHtml(notes)}</span></p>` : ""}
      <p><span class="text-slate-500">Payment Method:</span> <span class="font-medium text-navy-900">${methodLabel}</span></p>
      ${txnId ? `<p><span class="text-slate-500">Transaction ID:</span> <span class="font-medium text-navy-900">${escapeHtml(txnId)}</span></p>` : ""}
    </div>`;

  document.getElementById("confirmation-items").innerHTML = entries
    .map(([id, qty]) => {
      const p = PRODUCTS.find((p) => p.id === Number(id));
      if (!p) return "";
      return `<div class="flex justify-between text-sm py-1.5"><span>${p.name} <span class="text-slate-400">x${qty}</span></span><span class="font-medium">${formatPKR(p.price * qty)}</span></div>`;
    })
    .join("");
  document.getElementById("confirmation-subtotal").textContent = formatPKR(cartSubtotal());

  document.getElementById("checkout-content").classList.add("hidden");
  document.getElementById("checkout-empty").classList.add("hidden");
  document.getElementById("checkout-confirmation").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  clearCart();
}

document.addEventListener("DOMContentLoaded", () => {
  renderCheckoutSummary();
  document.getElementById("checkout-form")?.addEventListener("submit", placeOrder);
});
