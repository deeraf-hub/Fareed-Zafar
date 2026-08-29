// Shared site behaviour: navbar, mobile menu, cart drawer open/close, icons.

function openCart() {
  document.getElementById("cart-drawer")?.classList.remove("translate-x-full");
  document.getElementById("cart-overlay")?.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeCart() {
  document.getElementById("cart-drawer")?.classList.add("translate-x-full");
  document.getElementById("cart-overlay")?.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function toggleMobileMenu() {
  document.getElementById("mobile-menu")?.classList.toggle("hidden");
}

function closeMobileMenu() {
  document.getElementById("mobile-menu")?.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Sticky navbar shadow on scroll
  const nav = document.getElementById("navbar");
  if (nav) {
    window.addEventListener("scroll", () => {
      nav.classList.toggle("shadow-md", window.scrollY > 8);
    });
  }

  if (window.lucide) lucide.createIcons();
});
