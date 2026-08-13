/* ===================================================================
   Ahmad Money Transfer Point — dynamic behaviour
   - Live exchange rates (open.er-api.com, free, no API key)
   - Two currency converters (hero quick-convert + full converter)
   - Scrolling rate ticker + PKR rate table
   - Scroll reveal, animated counters, testimonial slider,
     mobile nav, dark mode, Netlify contact form (AJAX)
   =================================================================== */

(() => {
  "use strict";

  /* ---------------- Currencies ---------------- */
  const CURRENCIES = [
    { code: "PKR", name: "Pakistani Rupee", flag: "🇵🇰" },
    { code: "USD", name: "US Dollar", flag: "🇺🇸" },
    { code: "GBP", name: "British Pound", flag: "🇬🇧" },
    { code: "EUR", name: "Euro", flag: "🇪🇺" },
    { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
    { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦" },
    { code: "KWD", name: "Kuwaiti Dinar", flag: "🇰🇼" },
    { code: "QAR", name: "Qatari Riyal", flag: "🇶🇦" },
    { code: "OMR", name: "Omani Rial", flag: "🇴🇲" },
    { code: "BHD", name: "Bahraini Dinar", flag: "🇧🇭" },
    { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
    { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
    { code: "MYR", name: "Malaysian Ringgit", flag: "🇲🇾" },
    { code: "TRY", name: "Turkish Lira", flag: "🇹🇷" },
    { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
    { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  ];

  // Fallback rates (1 USD = X) used if the live API is unreachable.
  const FALLBACK_RATES = {
    USD: 1, PKR: 283.5, GBP: 0.78, EUR: 0.92, AED: 3.6725, SAR: 3.75,
    KWD: 0.3065, QAR: 3.64, OMR: 0.3845, BHD: 0.376, CAD: 1.36,
    AUD: 1.52, MYR: 4.45, TRY: 33.1, CNY: 7.15, JPY: 148.2,
  };

  const RATES_URL = "https://open.er-api.com/v6/latest/USD";
  const CACHE_KEY = "amtp_rates_v1";
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  let rates = { ...FALLBACK_RATES };
  let ratesLive = false;
  let ratesTimestamp = null;

  const $ = (id) => document.getElementById(id);

  /* ---------------- Rate fetching ---------------- */
  async function loadRates() {
    // Serve from cache when fresh
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.at < CACHE_TTL) {
        rates = cached.rates;
        ratesLive = true;
        ratesTimestamp = cached.at;
        return;
      }
    } catch (_) { /* ignore corrupt cache */ }

    try {
      const res = await fetch(RATES_URL);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data && data.result === "success" && data.rates) {
        rates = data.rates;
        ratesLive = true;
        ratesTimestamp = Date.now();
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: ratesTimestamp, rates })); } catch (_) {}
      }
    } catch (_) {
      // Keep fallback rates; UI will label them as indicative.
    }
  }

  function convert(amount, from, to) {
    if (!rates[from] || !rates[to]) return null;
    return amount * (rates[to] / rates[from]);
  }

  const fmt = (n, code) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: ["JPY"].includes(code) ? 0 : 2,
    });

  /* ---------------- Converters ---------------- */
  function fillSelect(sel, def) {
    sel.innerHTML = CURRENCIES.map(
      (c) => `<option value="${c.code}" ${c.code === def ? "selected" : ""}>${c.flag} ${c.code}</option>`
    ).join("");
  }

  function wireConverter({ amountEl, fromEl, toEl, resultEl, rateEl, swapEl, defFrom, defTo }) {
    fillSelect(fromEl, defFrom);
    fillSelect(toEl, defTo);

    const update = () => {
      const amount = parseFloat(amountEl.value) || 0;
      const from = fromEl.value, to = toEl.value;
      const out = convert(amount, from, to);
      const unit = convert(1, from, to);
      if (out === null) {
        resultEl.value = "—";
        rateEl.textContent = "Rate unavailable for this pair.";
        return;
      }
      resultEl.value = `${fmt(out, to)} ${to}`;
      const tag = ratesLive ? "live mid-market rate" : "indicative rate (offline)";
      rateEl.textContent = `1 ${from} = ${fmt(unit, to)} ${to} · ${tag}`;
    };

    amountEl.addEventListener("input", update);
    fromEl.addEventListener("change", update);
    toEl.addEventListener("change", update);
    swapEl.addEventListener("click", () => {
      const f = fromEl.value;
      fromEl.value = toEl.value;
      toEl.value = f;
      update();
    });

    return update;
  }

  /* ---------------- Ticker + table ---------------- */
  const TICKER_PAIRS = [
    ["USD", "PKR"], ["GBP", "PKR"], ["EUR", "PKR"], ["AED", "PKR"],
    ["SAR", "PKR"], ["KWD", "PKR"], ["QAR", "PKR"], ["CAD", "PKR"], ["AUD", "PKR"],
  ];

  function renderTicker() {
    const track = $("tickerTrack");
    if (!track) return;
    const items = TICKER_PAIRS.map(([from, to]) => {
      const r = convert(1, from, to);
      if (r === null) return "";
      const flag = (CURRENCIES.find((c) => c.code === from) || {}).flag || "";
      return `<span>${flag} <span class="code">${from}/${to}</span> <span class="up">${fmt(r, to)}</span></span>`;
    }).join("");
    track.innerHTML = items + items; // duplicated for the seamless loop
  }

  function renderTable() {
    const body = $("ratesTableBody");
    if (!body) return;
    const rows = CURRENCIES.filter((c) => c.code !== "PKR")
      .map((c) => {
        const r = convert(1, c.code, "PKR");
        if (r === null) return "";
        return `<tr><td><span class="flag">${c.flag}</span>${c.name}</td><td>${c.code}</td><td class="val">${fmt(r, "PKR")}</td></tr>`;
      })
      .join("");
    body.innerHTML = rows || `<tr><td colspan="3" class="muted">Rates unavailable right now.</td></tr>`;

    const updated = $("ratesUpdated");
    if (updated) {
      updated.textContent = ratesLive && ratesTimestamp
        ? `Rates updated ${new Date(ratesTimestamp).toLocaleString()}`
        : "Showing indicative rates — live feed unavailable.";
    }
  }

  /* ---------------- Scroll reveal ---------------- */
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ---------------- Animated counters ---------------- */
  function initCounters() {
    const nums = document.querySelectorAll(".stat-num");
    if (!nums.length) return;
    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const dur = 1600;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      }),
      { threshold: 0.5 }
    );
    nums.forEach((el) => io.observe(el));
  }

  /* ---------------- Testimonial slider ---------------- */
  function initSlider() {
    const slides = document.querySelectorAll("#slides .slide");
    const dotsWrap = $("sliderDots");
    if (!slides.length || !dotsWrap) return;
    let idx = 0, timer;

    slides.forEach((_, i) => {
      const b = document.createElement("button");
      b.setAttribute("aria-label", `Testimonial ${i + 1}`);
      b.addEventListener("click", () => { go(i); restart(); });
      dotsWrap.appendChild(b);
    });
    const dots = dotsWrap.querySelectorAll("button");

    const go = (i) => {
      idx = i;
      slides.forEach((s, j) => s.classList.toggle("active", j === i));
      dots.forEach((d, j) => d.classList.toggle("active", j === i));
    };
    const restart = () => { clearInterval(timer); timer = setInterval(() => go((idx + 1) % slides.length), 6000); };
    go(0);
    restart();
  }

  /* ---------------- Nav: mobile menu, scroll state, active link ---------------- */
  function initNav() {
    const nav = $("nav"), links = $("navLinks"), burger = $("hamburger");
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    burger.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        burger.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      })
    );

    // Highlight the section currently in view
    const sections = [...links.querySelectorAll("a")]
      .map((a) => ({ a, sec: document.querySelector(a.getAttribute("href")) }))
      .filter((x) => x.sec);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          sections.forEach(({ a, sec }) => a.classList.toggle("active", sec === e.target));
        }
      }),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(({ sec }) => io.observe(sec));
  }

  /* ---------------- Dark mode ---------------- */
  function initTheme() {
    const saved = localStorage.getItem("amtp_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    $("themeToggle").addEventListener("click", () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      if (dark) document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("amtp_theme", dark ? "light" : "dark");
    });
  }

  /* ---------------- Contact form (Netlify, AJAX) ---------------- */
  function initForm() {
    const form = $("contactForm"), status = $("formStatus"), btn = $("formSubmit");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = "Sending…";
      status.textContent = "";
      status.className = "form-status";
      try {
        const body = new URLSearchParams(new FormData(form)).toString();
        const res = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        status.textContent = "✅ Thank you! We received your message and will reply shortly.";
        status.classList.add("ok");
      } catch (_) {
        status.textContent = "⚠️ Could not send right now — please call or WhatsApp us instead.";
        status.classList.add("err");
      } finally {
        btn.disabled = false;
        btn.textContent = "Send Message";
      }
    });
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    $("year").textContent = new Date().getFullYear();
    initTheme();
    initNav();
    initReveal();
    initCounters();
    initSlider();
    initForm();

    const updateQuick = wireConverter({
      amountEl: $("qcAmount"), fromEl: $("qcFrom"), toEl: $("qcTo"),
      resultEl: $("qcResult"), rateEl: $("qcRateLine"), swapEl: $("qcSwap"),
      defFrom: "USD", defTo: "PKR",
    });
    const updateFull = wireConverter({
      amountEl: $("cvAmount"), fromEl: $("cvFrom"), toEl: $("cvTo"),
      resultEl: $("cvResult"), rateEl: $("cvRateLine"), swapEl: $("cvSwap"),
      defFrom: "GBP", defTo: "PKR",
    });

    await loadRates();
    updateQuick();
    updateFull();
    renderTicker();
    renderTable();

    // Refresh rates every 30 minutes while the page is open.
    setInterval(async () => {
      localStorage.removeItem(CACHE_KEY);
      await loadRates();
      updateQuick();
      updateFull();
      renderTicker();
      renderTable();
    }, CACHE_TTL);
  });
})();
