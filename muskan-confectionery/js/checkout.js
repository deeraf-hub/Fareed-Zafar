/* Checkout page: order summary, payment method selection, order placement. */

const DELIVERY_FEE = 150;
const FREE_DELIVERY_THRESHOLD = 3000;

function renderMiniCart() {
  const wrap = document.getElementById("mini-cart");
  const form = document.getElementById("checkout-form");
  const emptyState = document.getElementById("checkout-empty");
  if (!wrap) return;

  const lines = Cart.lines(PRODUCTS);
  if (lines.length === 0) {
    if (form) form.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (form) form.style.display = "grid";
  if (emptyState) emptyState.style.display = "none";

  wrap.innerHTML = lines
    .map((l) => `<div class="mini-cart-item"><span class="name">${l.product.name} × ${l.qty}</span><span>${PKR(l.product.price * l.qty)}</span></div>`)
    .join("");

  const subtotal = Cart.subtotal(PRODUCTS);
  const delivery = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_FEE;
  document.getElementById("sum-subtotal").textContent = PKR(subtotal);
  document.getElementById("sum-delivery").textContent = delivery === 0 ? "Free" : PKR(delivery);
  document.getElementById("sum-total").textContent = PKR(subtotal + delivery);
}

function wirePaymentOptions() {
  const options = document.querySelectorAll(".pay-option");
  function sync() {
    options.forEach((opt) => {
      const method = opt.getAttribute("data-method");
      const input = opt.querySelector("input");
      const details = document.querySelector(`[data-details="${method}"]`);
      opt.classList.toggle("selected", input.checked);
      if (details) details.classList.toggle("show", input.checked);
    });
  }
  options.forEach((opt) => {
    opt.addEventListener("click", () => {
      opt.querySelector("input").checked = true;
      sync();
    });
  });
  sync();
}

function buildAutoSubmitForm(action, fields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

function localFallbackOrder(payload) {
  const orderId = "MC" + Date.now().toString().slice(-8);
  return { orderId, total: payload.subtotal + payload.delivery, redirect: null };
}

async function submitOrder(payload) {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("checkout failed");
    return await res.json();
  } catch (e) {
    return localFallbackOrder(payload);
  }
}

function paymentNote(method, orderId) {
  if (method === "jazzcash" || method === "easypaisa") {
    const label = method === "jazzcash" ? "JazzCash" : "EasyPaisa";
    return `Please complete your payment via ${label} to <strong>0312-0215642</strong> (Muskan Confessionary), using <strong>${orderId}</strong> as the reference, then call us to confirm. If a secure payment page opened separately, complete it there instead.`;
  }
  return "Please keep exact cash ready — our rider will collect payment on delivery.";
}

function initCheckout() {
  renderMiniCart();
  Cart.onChange(renderMiniCart);
  wirePaymentOptions();

  const form = document.getElementById("checkout-form");
  const errorEl = document.getElementById("checkout-error");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";

    const lines = Cart.lines(PRODUCTS);
    if (lines.length === 0) return;

    const name = document.getElementById("cust-name").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const city = document.getElementById("cust-city").value.trim();
    const address = document.getElementById("cust-address").value.trim();
    const notes = document.getElementById("cust-notes").value.trim();
    const method = form.querySelector('input[name="payment"]:checked').value;

    if (!name || !phone || !city || !address) {
      errorEl.textContent = "Please fill in your name, phone, city and address.";
      errorEl.style.display = "block";
      return;
    }
    if (!/^0\d{9,10}$/.test(phone.replace(/[\s-]/g, ""))) {
      errorEl.textContent = "Please enter a valid Pakistani mobile number, e.g. 03120215642.";
      errorEl.style.display = "block";
      return;
    }

    const subtotal = Cart.subtotal(PRODUCTS);
    const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

    const btn = document.getElementById("place-order-btn");
    btn.disabled = true;
    btn.textContent = "Placing Order...";

    const payload = {
      customer: { name, phone, city, address, notes },
      items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
      paymentMethod: method,
      subtotal,
      delivery,
    };

    const result = await submitOrder(payload);

    if (result.redirect && result.redirect.action) {
      buildAutoSubmitForm(result.redirect.action, result.redirect.fields);
      return;
    }

    Cart.clear();
    form.style.display = "none";
    document.getElementById("checkout-empty").style.display = "none";
    document.getElementById("order-success").style.display = "block";
    document.getElementById("success-order-id").textContent = result.orderId;
    document.getElementById("success-payment-note").innerHTML = paymentNote(method, result.orderId);
    btn.disabled = false;
    btn.textContent = "Place Order";
  });
}

document.addEventListener("mc:products-ready", initCheckout);
document.addEventListener("DOMContentLoaded", () => {
  const checkIcon = document.getElementById("icon-order-check");
  if (checkIcon) checkIcon.innerHTML = icon("check");
});
