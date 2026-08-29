// Product catalog: search, category filter, sort, grid rendering, product details modal.

let activeCategory = "All Products";
let searchTerm = "";
let sortBy = "default";
let modalQty = 1;

function getFilteredProducts() {
  let list = PRODUCTS.slice();

  if (activeCategory !== "All Products") {
    list = list.filter((p) => p.category === activeCategory);
  }
  if (searchTerm.trim() !== "") {
    const term = searchTerm.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(term));
  }
  if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sortBy === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

function renderCategoryButtons() {
  const el = document.getElementById("category-filters");
  if (!el) return;
  const cats = ["All Products", ...CATEGORIES.map((c) => c.name)];
  el.innerHTML = cats
    .map(
      (c) => `
    <button data-cat="${c}" class="cat-btn px-4 py-2 rounded-full text-sm font-medium border transition whitespace-nowrap ${
        c === activeCategory
          ? "bg-navy-900 text-white border-navy-900"
          : "bg-white text-navy-800 border-slate-200 hover:border-navy-300"
      }">${c}</button>`
    )
    .join("");

  el.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderCategoryButtons();
      renderProducts();
    });
  });
}

function availabilityClasses(availability) {
  return availability === "Limited Stock"
    ? "text-amber-600"
    : "text-emerald-600";
}

function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const list = getFilteredProducts();
  const resultCountEl = document.getElementById("result-count");
  if (resultCountEl) {
    resultCountEl.textContent = `${list.length} product${list.length !== 1 ? "s" : ""} found`;
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-20">
        <p class="text-slate-500 text-lg">No products found. Try a different search or category.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (p) => `
    <div class="group bg-white rounded-2xl shadow-card overflow-hidden border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <button onclick="openProductModal(${p.id})" class="relative h-48 w-full overflow-hidden block">
        <img src="${p.image}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
        <span class="absolute top-3 left-3 bg-navy-900/90 text-white text-xs font-medium px-3 py-1 rounded-full">${p.category}</span>
      </button>
      <div class="p-4">
        <h3 class="font-semibold text-navy-900 mb-1 leading-snug">${p.name}</h3>
        <p class="text-xs font-medium mb-2 ${availabilityClasses(p.availability)}">${p.availability}</p>
        <div class="flex items-baseline gap-1.5 mb-4">
          <span class="text-lg font-bold text-orange-600">${formatPKR(p.price)}</span>
          <span class="text-xs text-slate-500">${p.unit}</span>
        </div>
        <div class="flex gap-2">
          <button onclick="addToCart(${p.id})" class="flex-1 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium py-2.5 rounded-lg transition">Add to Cart</button>
          <button onclick="openProductModal(${p.id})" aria-label="View details" class="px-3 py-2.5 border border-slate-200 rounded-lg hover:border-navy-300 hover:bg-slate-50 transition">
            <i data-lucide="eye" class="w-4 h-4 text-navy-900"></i>
          </button>
        </div>
      </div>
    </div>`
    )
    .join("");

  if (window.lucide) lucide.createIcons();
}

function openProductModal(id) {
  const p = PRODUCTS.find((p) => p.id === id);
  if (!p) return;
  modalQty = 1;

  document.getElementById("modal-content").innerHTML = `
    <div class="grid md:grid-cols-2 gap-0 md:gap-8">
      <img src="${p.image}" alt="${p.name}" class="w-full h-64 md:h-full object-cover rounded-t-2xl md:rounded-2xl">
      <div class="p-6 md:p-0 md:py-2">
        <span class="inline-block bg-navy-50 text-navy-700 text-xs font-medium px-3 py-1 rounded-full mb-3">${p.category}</span>
        <h2 class="text-2xl font-bold text-navy-900 mb-2">${p.name}</h2>
        <p class="text-slate-600 mb-4">${p.description}</p>
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-2xl font-bold text-orange-600">${formatPKR(p.price)}</span>
          <span class="text-sm text-slate-500">${p.unit}</span>
        </div>
        <p class="text-sm font-medium mb-6 ${availabilityClasses(p.availability)}">${p.availability}</p>
        <div class="flex items-center gap-3 mb-6">
          <span class="text-sm font-medium text-navy-900">Quantity</span>
          <button onclick="changeModalQty(-1)" aria-label="Decrease quantity" class="w-9 h-9 rounded-full border border-slate-300 hover:bg-slate-100 text-navy-900">-</button>
          <span id="modal-qty" class="w-8 text-center font-medium">1</span>
          <button onclick="changeModalQty(1)" aria-label="Increase quantity" class="w-9 h-9 rounded-full border border-slate-300 hover:bg-slate-100 text-navy-900">+</button>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <button onclick="addModalToCart(${p.id})" class="flex-1 bg-navy-900 hover:bg-navy-800 text-white font-medium py-3 rounded-lg transition">Add to Cart</button>
          <a href="tel:+923496693739" class="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-lg transition">
            <i data-lucide="phone" class="w-4 h-4"></i> Call Now
          </a>
        </div>
      </div>
    </div>`;

  document.getElementById("product-modal").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  if (window.lucide) lucide.createIcons();
}

function changeModalQty(delta) {
  modalQty = Math.max(1, modalQty + delta);
  const el = document.getElementById("modal-qty");
  if (el) el.textContent = modalQty;
}

function addModalToCart(id) {
  addToCart(id, modalQty);
  closeProductModal();
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  renderCategoryButtons();
  renderProducts();

  const params = new URLSearchParams(window.location.search);
  const catParam = params.get("category");
  if (catParam) {
    const match = CATEGORIES.find((c) => c.id === catParam);
    if (match) {
      activeCategory = match.name;
      renderCategoryButtons();
      renderProducts();
    }
  }
  const searchParam = params.get("search");
  if (searchParam) {
    searchTerm = searchParam;
    document.getElementById("search-input").value = searchParam;
    renderProducts();
  }

  document.getElementById("search-input")?.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderProducts();
  });

  document.getElementById("sort-select")?.addEventListener("change", (e) => {
    sortBy = e.target.value;
    renderProducts();
  });

  document.getElementById("product-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "product-modal") closeProductModal();
  });
});
