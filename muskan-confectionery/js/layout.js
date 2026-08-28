/* Fills icon placeholders and injects the shared footer on every page. */

const SIMPLE_ICON_MAP = {
  "icon-wrenchBadge": "wrenchBadge",
  "icon-phone-btn": "phone",
  "icon-hero-gear": "gear",
  "icon-shield": "shield",
  "icon-truck": "truck",
  "icon-tag": "tag",
  "icon-headset": "headset",
  "icon-close-btn": "close",
};

function initIcons() {
  Object.entries(SIMPLE_ICON_MAP).forEach(([id, name]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icon(name);
  });
  const cartBtn = document.getElementById("icon-cart-btn");
  if (cartBtn) cartBtn.insertAdjacentHTML("afterbegin", icon("cart"));
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="brand">
            <span class="brand-mark">${icon("wrenchBadge")}</span>
            <span class="brand-text">
              <span class="name">Muskan Confessionary</span>
              <span class="tag">Bike Spare Parts</span>
            </span>
          </div>
          <p class="about">Genuine motorbike spare parts for every rider in Karachi — engine, brakes, electricals, suspension and more, at fair prices with fast local delivery.</p>
        </div>
        <div class="footer-col">
          <h5>Quick Links</h5>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="shop.html">Shop</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Top Categories</h5>
          <ul>
            <li><a href="shop.html?category=Engine">Engine Parts</a></li>
            <li><a href="shop.html?category=Brakes">Brake System</a></li>
            <li><a href="shop.html?category=Electrical">Electricals</a></li>
            <li><a href="shop.html?category=Suspension">Suspension</a></li>
            <li><a href="shop.html?category=Tyres">Tyres &amp; Tubes</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Visit / Call Us</h5>
          <ul class="footer-contact">
            <li>${icon("pin")} <span>Al Hammad Plaza, Shop No 16, Sector 5B2, North Karachi Central, Karachi</span></li>
            <li>${icon("phone")} <a href="tel:+923120215642">0312-0215642</a></li>
            <li>${icon("clock")} <span>Mon – Sat: 10:00 AM – 9:00 PM</span></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span id="footer-year"></span> Muskan Confessionary. All rights reserved.</span>
        <span>Made for riders in Karachi 🏍️</span>
      </div>
    </div>`;
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  initIcons();
  renderFooter();
});
