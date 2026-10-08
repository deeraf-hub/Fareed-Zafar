/* =========================================================
   Larkana Communication — interactions
   ========================================================= */
(function () {
  "use strict";

  // WhatsApp number in international format, no "+" or spaces.
  // Taken from the current site; confirm it is the real line before going live.
  const WHATSAPP_NUMBER = "923001234567";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const fmt = (n) => "₨ " + Number(n).toLocaleString("en-PK");
  const waLink = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

  /* ---------------- Product illustrations (inline SVG) ---------------- */
  const art = {
    watch: (id, a, b) => `
      <svg viewBox="0 0 200 260"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect x="58" y="0" width="84" height="70" rx="16" fill="#1c1f33"/><rect x="58" y="190" width="84" height="70" rx="16" fill="#1c1f33"/>
      <rect x="28" y="50" width="144" height="160" rx="40" fill="#23263d" stroke="#3b3f63" stroke-width="3"/>
      <rect x="172" y="104" width="9" height="30" rx="4" fill="#3b3f63"/>
      <rect x="42" y="64" width="116" height="132" rx="30" fill="#05060c"/>
      <circle cx="100" cy="130" r="40" fill="none" stroke="url(#${id})" stroke-width="8" stroke-linecap="round" stroke-dasharray="190 260"/>
      <text x="100" y="138" text-anchor="middle" font-family="Space Grotesk,sans-serif" font-size="24" font-weight="700" fill="#fff">10:09</text></svg>`,
    earbuds: (id, a, b) => `
      <svg viewBox="0 0 200 200"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect x="40" y="96" width="120" height="84" rx="38" fill="#eef0ff"/><rect x="40" y="96" width="120" height="30" rx="15" fill="#d6d9ee"/>
      <rect x="92" y="140" width="16" height="5" rx="2.5" fill="url(#${id})"/>
      <g><circle cx="70" cy="56" r="24" fill="#fff"/><circle cx="70" cy="56" r="11" fill="url(#${id})"/><rect x="62" y="64" width="16" height="44" rx="8" fill="#fff"/></g>
      <g><circle cx="130" cy="52" r="24" fill="#fff"/><circle cx="130" cy="52" r="11" fill="url(#${id})"/><rect x="122" y="60" width="16" height="44" rx="8" fill="#fff"/></g></svg>`,
    cable: (id, a, b) => `
      <svg viewBox="0 0 200 200"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <path d="M50 40 C 50 120, 150 60, 150 160" fill="none" stroke="url(#${id})" stroke-width="10" stroke-linecap="round"/>
      <rect x="36" y="14" width="28" height="36" rx="6" fill="#e5e7eb"/><rect x="42" y="4" width="16" height="14" rx="3" fill="#9ca3af"/>
      <rect x="136" y="150" width="28" height="36" rx="6" fill="#e5e7eb"/><rect x="143" y="182" width="14" height="12" rx="4" fill="#9ca3af"/></svg>`,
    charger: (id, a, b) => `
      <svg viewBox="0 0 200 200"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect x="78" y="14" width="10" height="34" rx="3" fill="#9ca3af"/><rect x="112" y="14" width="10" height="34" rx="3" fill="#9ca3af"/>
      <rect x="44" y="44" width="112" height="128" rx="26" fill="#f3f4f6"/>
      <rect x="84" y="140" width="32" height="12" rx="4" fill="#1f2937"/>
      <path d="M106 70 84 104h16l-6 26 22-36h-16z" fill="url(#${id})"/></svg>`,
    powerbank: (id, a, b) => `
      <svg viewBox="0 0 200 200"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect x="54" y="14" width="92" height="172" rx="22" fill="url(#${id})"/>
      <rect x="62" y="22" width="76" height="156" rx="16" fill="#111326" opacity=".35"/>
      <g fill="#fff"><circle cx="82" cy="150" r="5"/><circle cx="96" cy="150" r="5"/><circle cx="110" cy="150" r="5" opacity=".9"/><circle cx="124" cy="150" r="5" opacity=".3"/></g>
      <text x="100" y="96" text-anchor="middle" font-family="Space Grotesk,sans-serif" font-size="20" font-weight="700" fill="#fff">10K</text>
      <text x="100" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" fill="#fff" opacity=".8">mAh</text></svg>`,
    speaker: (id, a, b) => `
      <svg viewBox="0 0 200 200"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect x="30" y="50" width="140" height="110" rx="50" fill="url(#${id})"/>
      <rect x="40" y="60" width="120" height="90" rx="42" fill="#0b0c18" opacity=".35"/>
      <g fill="#fff" opacity=".5">${Array.from({ length: 24 }, (_, i) => `<circle cx="${62 + (i % 8) * 11}" cy="${86 + Math.floor(i / 8) * 18}" r="3"/>`).join("")}</g>
      <rect x="84" y="160" width="32" height="10" rx="5" fill="#1f2937"/></svg>`,
    headphones: (id, a, b) => `
      <svg viewBox="0 0 200 200"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <path d="M40 120 V100 a60 60 0 0 1 120 0 V120" fill="none" stroke="#e5e7eb" stroke-width="12" stroke-linecap="round"/>
      <rect x="24" y="104" width="44" height="72" rx="20" fill="url(#${id})"/><rect x="132" y="104" width="44" height="72" rx="20" fill="url(#${id})"/>
      <rect x="34" y="116" width="24" height="48" rx="12" fill="#0b0c18" opacity=".3"/><rect x="142" y="116" width="24" height="48" rx="12" fill="#0b0c18" opacity=".3"/></svg>`,
    case: (id, a, b) => `
      <svg viewBox="0 0 200 200"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect x="52" y="8" width="96" height="184" rx="22" fill="url(#${id})"/>
      <rect x="62" y="20" width="44" height="50" rx="12" fill="#0b0c18" opacity=".55"/>
      <circle cx="76" cy="36" r="8" fill="#1f2937" stroke="#9ca3af" stroke-width="2"/><circle cx="92" cy="54" r="8" fill="#1f2937" stroke="#9ca3af" stroke-width="2"/>
      <text x="100" y="140" text-anchor="middle" font-family="Space Grotesk,sans-serif" font-size="16" font-weight="700" fill="#fff" opacity=".85">LC</text></svg>`,
  };

  /* ---------------- Product catalogue ----------------
     Ronin R-09, Ronin Luxe R-09, Powerlink II and the everyday cable use prices
     listed on the current site. Other items and prices are samples: replace them
     with the live catalogue before launch. */
  const products = [
    { id: "ronin-r09", name: "Ronin R-09 Smartwatch", cat: "wearables", label: "Smartwatch", art: "watch", c: ["#7c5cff", "#22d3ee"], price: 8595, rating: 5, badge: "hot" },
    { id: "ronin-luxe-r09", name: "Ronin Luxe R-09 Smartwatch", cat: "wearables", label: "Smartwatch", art: "watch", c: ["#f472b6", "#7c5cff"], price: 9495, rating: 5, badge: "new" },
    { id: "powerlink-ii", name: "Powerlink II Fast Charging Cable", cat: "charging", label: "Cable", art: "cable", c: ["#22d3ee", "#34d399"], price: 650, priceMax: 950, rating: 4 },
    { id: "everyday-cable", name: "Everyday Charging Cable", cat: "charging", label: "Cable", art: "cable", c: ["#f59e0b", "#ff7a59"], price: 250, priceMax: 300, rating: 4 },
    { id: "tws-pro", name: "True Wireless Earbuds Pro", cat: "audio", label: "Earbuds", art: "earbuds", c: ["#7c5cff", "#22d3ee"], price: 4999, was: 6499, rating: 5, badge: "sale" },
    { id: "pd-20w", name: "20W PD Fast Wall Charger", cat: "charging", label: "Charger", art: "charger", c: ["#f59e0b", "#fcd34d"], price: 1899, rating: 4 },
    { id: "pb-10k", name: "10,000mAh Slim Power Bank", cat: "charging", label: "Power Bank", art: "powerbank", c: ["#7c5cff", "#22d3ee"], price: 3499, rating: 5 },
    { id: "bt-speaker", name: "Portable Bluetooth Speaker", cat: "audio", label: "Speaker", art: "speaker", c: ["#ff7a59", "#f472b6"], price: 3999, was: 4799, rating: 4, badge: "sale" },
    { id: "headphones", name: "Wireless Over-Ear Headphones", cat: "audio", label: "Headphones", art: "headphones", c: ["#22d3ee", "#7c5cff"], price: 5499, rating: 4 },
    { id: "shock-case", name: "Shockproof Phone Case", cat: "protection", label: "Case", art: "case", c: ["#ff6b8b", "#7c5cff"], price: 899, rating: 4 },
    { id: "clear-case", name: "Crystal Clear MagSafe-Style Case", cat: "protection", label: "Case", art: "case", c: ["#34d399", "#22d3ee"], price: 1199, rating: 5, badge: "new" },
    { id: "tws-lite", name: "Wireless Earbuds Lite", cat: "audio", label: "Earbuds", art: "earbuds", c: ["#34d399", "#22d3ee"], price: 2799, rating: 4 },
  ];
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const priceLabel = (p) => (p.priceMax ? `${fmt(p.price)} – ${fmt(p.priceMax)}` : fmt(p.price));

  /* ---------------- Preloader ---------------- */
  const finishLoading = () => {
    document.body.classList.add("loaded");
    $("#preloader")?.classList.add("done");
  };
  if (document.readyState === "complete") finishLoading();
  else window.addEventListener("load", () => setTimeout(finishLoading, 350));
  setTimeout(finishLoading, 3000); // never block the page on a slow asset

  /* ---------------- Year ---------------- */
  $("#year").textContent = new Date().getFullYear();

  /* ---------------- Nav, progress, back-to-top ---------------- */
  const nav = $("#nav");
  const progress = $("#scrollProgress");
  const toTop = $("#toTop");
  const timelineFill = $("#timelineFill");
  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle("scrolled", y > 20);
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    toTop.classList.toggle("show", y > 700);

    if (timelineFill) {
      const r = timelineFill.parentElement.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (window.innerHeight * 0.8 - r.top) / (window.innerHeight * 0.4)));
      timelineFill.style.transform = `scaleX(${t})`;
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  /* Active link highlighting */
  const navLinks = $$(".nav__links a");
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => spy.observe(s));

  /* Mobile menu */
  const menuToggle = $("#menuToggle");
  const navMenu = $("#navLinks");
  const setMenu = (open) => {
    navMenu.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
  };
  menuToggle.addEventListener("click", () => setMenu(!navMenu.classList.contains("open")));
  navLinks.forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------------- Reveal on scroll ---------------- */
  const revealer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add("in");
        // Drop the stagger delay once revealed so hover effects respond instantly.
        setTimeout(() => el.classList.add("done"), 1500);
        revealer.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el) => revealer.observe(el));

  /* ---------------- Counters ---------------- */
  const counterObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = Number(el.dataset.target);
        const suffix = el.dataset.suffix || "";
        const dur = reduceMotion ? 0 : 1800;
        const start = performance.now();
        const tick = (now) => {
          const p = dur ? Math.min(1, (now - start) / dur) : 1;
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        counterObs.unobserve(el);
      });
    },
    { threshold: 0.6 }
  );
  $$(".counter").forEach((el) => counterObs.observe(el));

  /* ---------------- Products ---------------- */
  const grid = $("#productGrid");
  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  const badgeHtml = (b, p) => {
    if (!b) return "";
    if (b === "sale" && p.was) return `<span class="badge">-${Math.round((1 - p.price / p.was) * 100)}%</span>`;
    return `<span class="badge badge--${b}">${b === "hot" ? "Best seller" : b === "new" ? "New" : "Sale"}</span>`;
  };

  grid.innerHTML = products
    .map(
      (p, i) => `
      <article class="product" data-cat="${p.cat}" style="--tint:${p.c[0]}40; animation-delay:${(i % 4) * 60}ms">
        <div class="product__media">
          ${badgeHtml(p.badge, p)}
          <button class="wish" aria-label="Add ${p.name} to wishlist" aria-pressed="false">♡</button>
          ${art[p.art](`g-${p.id}`, p.c[0], p.c[1])}
        </div>
        <div class="product__body">
          <span class="product__cat">${p.label}</span>
          <h3 class="product__name">${p.name}</h3>
          <span class="product__rating" aria-label="${p.rating} out of 5 stars">${stars(p.rating)}</span>
          <div class="product__foot">
            <span class="price">${priceLabel(p)}${p.was ? `<del>${fmt(p.was)}</del>` : ""}</span>
            <button class="add-btn" data-add="${p.id}" aria-label="Add ${p.name} to cart">+</button>
          </div>
        </div>
      </article>`
    )
    .join("");

  /* Filtering */
  const filterBtns = $$(".filter");
  const applyFilter = (f) => {
    filterBtns.forEach((b) => {
      const on = b.dataset.filter === f;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    let i = 0;
    $$(".product", grid).forEach((card) => {
      const show = f === "all" || card.dataset.cat === f;
      card.classList.toggle("hide", !show);
      if (show) {
        // Restart the entrance animation for a smooth re-shuffle.
        card.style.animation = "none";
        void card.offsetWidth;
        card.style.animation = "";
        card.style.animationDelay = `${i++ * 60}ms`;
      }
    });
  };
  filterBtns.forEach((b) => b.addEventListener("click", () => applyFilter(b.dataset.filter)));
  $$("[data-filter-link]").forEach((a) => a.addEventListener("click", () => applyFilter(a.dataset.filterLink)));

  /* Wishlist */
  grid.addEventListener("click", (e) => {
    const w = e.target.closest(".wish");
    if (!w) return;
    const on = !w.classList.contains("on");
    w.classList.toggle("on", on);
    w.textContent = on ? "♥" : "♡";
    w.setAttribute("aria-pressed", String(on));
    toast(on ? "Added to wishlist" : "Removed from wishlist");
  });

  /* 3D tilt + spotlight */
  if (finePointer && !reduceMotion) {
    grid.addEventListener("mousemove", (e) => {
      const card = e.target.closest(".product");
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
    });
    grid.addEventListener(
      "mouseout",
      (e) => {
        const card = e.target.closest(".product");
        if (card && !card.contains(e.relatedTarget)) card.style.transform = "";
      }
    );
    $$(".cat-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------------- Cart ---------------- */
  const CART_KEY = "lc-cart";
  let cart = {};
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || {};
    Object.keys(cart).forEach((id) => { if (!byId[id]) delete cart[id]; });
  } catch (_) { cart = {}; }
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) {} };

  const drawer = $("#cartDrawer");
  const overlay = $("#drawerOverlay");
  const cartItems = $("#cartItems");
  const cartCount = $("#cartCount");
  const cartTotal = $("#cartTotal");

  const openCart = (open) => {
    drawer.classList.toggle("open", open);
    overlay.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("no-scroll", open);
    if (open) $("#cartClose").focus();
  };
  $("#cartBtn").addEventListener("click", () => openCart(true));
  $("#cartClose").addEventListener("click", () => openCart(false));
  overlay.addEventListener("click", () => openCart(false));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    openCart(false);
    setMenu(false);
  });

  const renderCart = () => {
    const ids = Object.keys(cart);
    const count = ids.reduce((n, id) => n + cart[id], 0);
    const total = ids.reduce((s, id) => s + byId[id].price * cart[id], 0);
    cartCount.textContent = count;
    cartCount.classList.toggle("has-items", count > 0);
    cartTotal.textContent = fmt(total);
    $("#checkoutBtn").disabled = count === 0;

    cartItems.innerHTML = ids.length
      ? ids
          .map((id) => {
            const p = byId[id];
            return `
            <div class="cart-item">
              <div class="cart-item__thumb">${art[p.art](`c-${p.id}`, p.c[0], p.c[1])}</div>
              <div>
                <h4>${p.name}</h4>
                <small>${p.priceMax ? "from " : ""}${fmt(p.price)}</small>
                <div class="qty">
                  <button data-qty="-1" data-id="${id}" aria-label="Decrease quantity">−</button>
                  <span>${cart[id]}</span>
                  <button data-qty="1" data-id="${id}" aria-label="Increase quantity">+</button>
                </div>
              </div>
              <button class="cart-item__remove" data-remove="${id}" aria-label="Remove ${p.name}">✕</button>
            </div>`;
          })
          .join("")
      : `<div class="drawer__empty"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1 14H6z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><p>Your cart is empty.<br/>Let's find something you'll love.</p></div>`;
  };

  const addToCart = (id, btn) => {
    if (!byId[id]) return;
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    renderCart();
    cartCount.classList.remove("bump");
    void cartCount.offsetWidth;
    cartCount.classList.add("bump");
    toast(`${byId[id].name} added to cart`);
    if (btn && btn.classList.contains("add-btn")) {
      btn.classList.add("added");
      btn.textContent = "✓";
      setTimeout(() => { btn.classList.remove("added"); btn.textContent = "+"; }, 1200);
    }
  };

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) addToCart(add.dataset.add, add);
  });

  cartItems.addEventListener("click", (e) => {
    const q = e.target.closest("[data-qty]");
    const r = e.target.closest("[data-remove]");
    if (q) {
      const id = q.dataset.id;
      cart[id] += Number(q.dataset.qty);
      if (cart[id] <= 0) delete cart[id];
    } else if (r) {
      delete cart[r.dataset.remove];
    } else return;
    saveCart();
    renderCart();
  });

  $("#checkoutBtn").addEventListener("click", () => {
    const ids = Object.keys(cart);
    if (!ids.length) return;
    const lines = ids.map((id) => `• ${byId[id].name} × ${cart[id]} (${priceLabel(byId[id])})`);
    const total = ids.reduce((s, id) => s + byId[id].price * cart[id], 0);
    const msg = `Assalam o Alaikum! I'd like to order:\n${lines.join("\n")}\n\nEstimated subtotal: ${fmt(total)}\nPlease confirm availability and delivery.`;
    window.open(waLink(msg), "_blank", "noopener");
  });

  renderCart();

  /* ---------------- Countdown (ends Sunday 23:59:59 local time) ---------------- */
  const countdown = $("#countdown");
  const endOfWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    d.setHours(23, 59, 59, 999);
    return d;
  };
  let deadline = endOfWeek();
  const units = {
    days: $('[data-unit="days"]', countdown),
    hours: $('[data-unit="hours"]', countdown),
    minutes: $('[data-unit="minutes"]', countdown),
    seconds: $('[data-unit="seconds"]', countdown),
  };
  const pad = (n) => String(n).padStart(2, "0");
  const tickCountdown = () => {
    let ms = deadline - Date.now();
    if (ms <= 0) { deadline = endOfWeek(); ms = deadline - Date.now(); }
    const s = Math.floor(ms / 1000);
    units.days.textContent = pad(Math.floor(s / 86400));
    units.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    units.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    units.seconds.textContent = pad(s % 60);
  };
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ---------------- Open / closed badge (Mon–Sat, 9–6 Pakistan time) ---------------- */
  const openBadge = $("#openBadge");
  const updateOpen = () => {
    const pk = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    const day = pk.getDay();
    const h = pk.getHours();
    const open = day !== 0 && h >= 9 && h < 18;
    openBadge.textContent = open ? "● Open now" : "Closed now";
    openBadge.classList.toggle("open", open);
  };
  updateOpen();
  setInterval(updateOpen, 60000);

  /* ---------------- Forms ---------------- */
  const setInvalid = (input, bad) => input.closest(".field")?.classList.toggle("invalid", bad);

  const topupForm = $("#topupForm");
  const amountInput = $('input[name="amount"]', topupForm);
  $$(".quick-amounts button", topupForm).forEach((b) =>
    b.addEventListener("click", () => {
      amountInput.value = b.dataset.amount;
      $$(".quick-amounts button", topupForm).forEach((x) => x.classList.toggle("on", x === b));
      setInvalid(amountInput, false);
    })
  );
  topupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const phone = $('input[name="phone"]', topupForm);
    const network = $('input[name="network"]:checked', topupForm).value;
    const phoneOk = /^03\d{2}\s?\d{7}$/.test(phone.value.trim());
    const amountOk = Number(amountInput.value) >= 100;
    setInvalid(phone, !phoneOk);
    setInvalid(amountInput, !amountOk);
    if (!phoneOk || !amountOk) return;
    const msg = `Hi! I'd like to pay through a mobile top-up.\nNetwork: ${network}\nNumber: ${phone.value.trim()}\nAmount: ${fmt(amountInput.value)}`;
    window.open(waLink(msg), "_blank", "noopener");
    toast("Opening WhatsApp…");
  });

  const contactForm = $("#contactForm");
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = contactForm.elements.name;
    const email = contactForm.elements.email;
    const message = contactForm.elements.message;
    const ok = [
      [name, name.value.trim().length > 1],
      [email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())],
      [message, message.value.trim().length > 2],
    ].map(([el, valid]) => (setInvalid(el, !valid), valid));
    if (ok.includes(false)) return;
    // No backend yet: hand the message to the visitor's mail app.
    const body = `${message.value.trim()}\n\n${name.value.trim()}\n${contactForm.elements.phone.value.trim()}`;
    window.location.href = `mailto:larkanacommunication@gmail.com?subject=${encodeURIComponent("Website enquiry from " + name.value.trim())}&body=${encodeURIComponent(body)}`;
    toast("Opening your email app…");
    contactForm.reset();
  });

  $$(".field input, .field textarea").forEach((el) => el.addEventListener("input", () => setInvalid(el, false)));

  $("#newsletterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("input", e.target);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
      toast("Please enter a valid email address");
      input.focus();
      return;
    }
    // Hook this up to the merchant's mailing-list provider.
    toast("Thanks! You're on the list 🎉");
    e.target.reset();
  });

  /* WhatsApp float */
  $("#waFloat").href = waLink("Hi Larkana Communication! I have a question about your products.");

  /* ---------------- Toast ---------------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  /* ---------------- Cursor glow + magnetic buttons ---------------- */
  if (finePointer && !reduceMotion) {
    const glow = $("#cursorGlow");
    let gx = 0, gy = 0, tx = 0, ty = 0;
    window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const follow = () => {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx - 240}px, ${gy - 240}px)`;
      requestAnimationFrame(follow);
    };
    follow();

    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.3}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });

    /* Hero parallax */
    const visual = $(".hero__visual");
    window.addEventListener(
      "mousemove",
      (e) => {
        if (window.scrollY > window.innerHeight) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        visual.style.translate = `${x}px ${y}px`;
      },
      { passive: true }
    );
  }
})();
