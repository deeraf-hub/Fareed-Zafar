/* Shared UI wiring: header, cart drawer, product rendering, page-specific renderers. */

const PKR = (n) => "Rs " + Number(n).toLocaleString("en-PK");

const CATEGORY_ICON = {
  Drivetrain: "gear",
  Brakes: "brake",
  Engine: "engine",
  Fluids: "oil",
  Electrical: "battery",
  Body: "body",
  Suspension: "wheel",
  Tyres: "wheel",
};

let PRODUCTS = [];

/* ---------------- data ---------------- */
async function loadProducts() {
  try {
    const res = await fetch("data/products.json");
    if (!res.ok) throw new Error("bad response");
    PRODUCTS = await res.json();
  } catch (e) {
    PRODUCTS = [];
    console.error("Could not load product catalog. Serve this site over HTTP (npm start), not file://.", e);
  }
  return PRODUCTS;
}

/* ---------------- toast ---------------- */
let toastTimer;
function showToast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `${icon("check")}<span></span>`;
    document.body.appendChild(el);
  }
  el.querySelector("span").textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------------- header / cart drawer ---------------- */
function initHeader() {
  const header = document.querySelector(".site-header");
  window.addEventListener("scroll", () => {
    if (header) header.style.boxShadow = window.scrollY > 8 ? "0 4px 20px rgba(15,42,74,0.12)" : "";
  });

  const hamburger = document.querySelector(".hamburger");
  const nav = document.querySelector(".main-nav");
  if (hamburger && nav) {
    hamburger.addEventListener("click", () => nav.classList.toggle("mobile-open"));
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("mobile-open")));
  }

  const overlay = document.querySelector(".overlay");
  const drawer = document.querySelector(".cart-drawer");
  const openBtns = document.querySelectorAll("[data-open-cart]");
  const closeBtns = document.querySelectorAll("[data-close-cart]");

  function openCart() {
    drawer?.classList.add("open");
    overlay?.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    drawer?.classList.remove("open");
    overlay?.classList.remove("open");
    document.body.style.overflow = "";
  }
  openBtns.forEach((b) => b.addEventListener("click", openCart));
  closeBtns.forEach((b) => b.addEventListener("click", closeCart));
  overlay?.addEventListener("click", closeCart);

  Cart.onChange(renderCartDrawer);
  renderCartDrawer(Cart.getState());
}

function updateCartBadges() {
  const n = Cart.count();
  document.querySelectorAll(".cart-badge").forEach((b) => {
    b.textContent = n;
    b.style.display = n > 0 ? "flex" : "none";
  });
}

function renderCartDrawer() {
  updateCartBadges();
  const itemsEl = document.querySelector(".cart-items");
  const footEl = document.querySelector(".cart-foot");
  if (!itemsEl) return;

  const lines = Cart.lines(PRODUCTS);
  if (lines.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        ${icon("emptyCart")}
        <p>Your cart is empty.</p>
      </div>`;
    if (footEl) footEl.style.display = "none";
    return;
  }
  if (footEl) footEl.style.display = "block";

  itemsEl.innerHTML = lines
    .map(
      (l) => `
    <div class="cart-item" data-id="${l.product.id}">
      <div class="cart-item-media">${icon(l.product.icon)}</div>
      <div class="cart-item-info">
        <h4>${l.product.name}</h4>
        <div class="cat">${l.product.category}</div>
        <div class="cart-item-price">${PKR(l.product.price * l.qty)}</div>
      </div>
      <div class="cart-item-actions">
        <div class="qty-stepper">
          <button data-dec>${icon("minus")}</button>
          <span>${l.qty}</span>
          <button data-inc>${icon("plus")}</button>
        </div>
        <button class="remove-btn" data-remove>Remove</button>
      </div>
    </div>`
    )
    .join("");

  const subtotalEl = document.querySelector(".cart-subtotal-amount");
  if (subtotalEl) subtotalEl.textContent = PKR(Cart.subtotal(PRODUCTS));

  itemsEl.querySelectorAll(".cart-item").forEach((row) => {
    const id = row.dataset.id;
    const current = Cart.getState()[id] || 0;
    row.querySelector("[data-inc]").addEventListener("click", () => Cart.setQty(id, current + 1));
    row.querySelector("[data-dec]").addEventListener("click", () => Cart.setQty(id, current - 1));
    row.querySelector("[data-remove]").addEventListener("click", () => Cart.remove(id));
  });
}

/* ---------------- product card / add to cart ---------------- */
function productCardHTML(p) {
  return `
    <article class="product-card reveal" data-id="${p.id}" data-category="${p.category}" data-name="${p.name.toLowerCase()}">
      <div class="product-media">
        <span class="product-tag">${p.category}</span>
        ${icon(p.icon)}
      </div>
      <div class="product-body">
        <span class="cat">${p.category}</span>
        <h3>${p.name}</h3>
        <p class="desc">${p.desc}</p>
        <div class="product-foot">
          <div class="price">${PKR(p.price)}<br><small>incl. all taxes</small></div>
          <button class="add-btn" data-add="${p.id}">${icon("cart")} Add</button>
        </div>
      </div>
    </article>`;
}

function wireAddButtons(root) {
  root.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-add");
      const product = PRODUCTS.find((p) => p.id === id);
      Cart.add(id, 1);
      if (product) showToast(`${product.name} added to cart`);
      btn.innerHTML = `${icon("check")} Added`;
      setTimeout(() => (btn.innerHTML = `${icon("cart")} Add`), 1200);
    });
  });
}

/* ---------------- reveal on scroll ---------------- */
let revealFallbackTimer;
function initReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.01, rootMargin: "0px 0px 120px 0px" }
  );
  document.querySelectorAll(".reveal:not(.in-view)").forEach((el) => io.observe(el));

  // Safety net: never let content stay invisible if it's off-screen, printed,
  // captured by a screenshot/crawler, or the observer otherwise never fires.
  clearTimeout(revealFallbackTimer);
  revealFallbackTimer = setTimeout(() => {
    document.querySelectorAll(".reveal:not(.in-view)").forEach((el) => el.classList.add("in-view"));
  }, 1200);
}

/* ---------------- home page ---------------- */
function renderFeatured() {
  const grid = document.getElementById("featured-grid");
  if (!grid) return;
  const featured = PRODUCTS.slice(0, 8);
  grid.innerHTML = featured.map(productCardHTML).join("");
  wireAddButtons(grid);
  initReveal();
}

function renderCategories() {
  const grid = document.getElementById("category-grid");
  if (!grid) return;
  const cats = {};
  PRODUCTS.forEach((p) => {
    cats[p.category] = (cats[p.category] || 0) + 1;
  });
  grid.innerHTML = Object.entries(cats)
    .map(
      ([name, count]) => `
      <a href="shop.html?category=${encodeURIComponent(name)}" class="cat-card reveal">
        <div class="cat-icon">${icon(CATEGORY_ICON[name] || "gear")}</div>
        <h4>${name}</h4>
        <p>${count} items</p>
      </a>`
    )
    .join("");
  initReveal();
}

/* ---------------- shop page ---------------- */
function renderShop() {
  const grid = document.getElementById("shop-grid");
  if (!grid) return;

  const chipsWrap = document.getElementById("filter-chips");
  const sortSelect = document.getElementById("sort-select");
  const searchInput = document.getElementById("search-input");
  const resultCount = document.getElementById("result-count");

  const params = new URLSearchParams(window.location.search);
  let activeCategory = params.get("category") || "All";

  const categories = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
  chipsWrap.innerHTML = categories
    .map((c) => `<button class="chip ${c === activeCategory ? "active" : ""}" data-cat="${c}">${c}</button>`)
    .join("");

  function apply() {
    let list = PRODUCTS.filter((p) => activeCategory === "All" || p.category === activeCategory);
    const q = searchInput.value.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));

    const sort = sortSelect.value;
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "name-asc") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

    resultCount.textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;

    grid.innerHTML = list.length
      ? list.map(productCardHTML).join("")
      : `<div class="empty-state">${icon("search")}<p>No parts match your search. Try a different keyword or category.</p></div>`;
    wireAddButtons(grid);
    initReveal();
  }

  chipsWrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.getAttribute("data-cat");
      chipsWrap.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      apply();
    });
  });
  sortSelect.addEventListener("change", apply);
  searchInput.addEventListener("input", apply);

  apply();
}

/* ---------------- boot ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
  await loadProducts();
  initHeader();
  renderFeatured();
  renderCategories();
  renderShop();
  initReveal();
  updateCartBadges();
  document.dispatchEvent(new CustomEvent("mc:products-ready"));
});
