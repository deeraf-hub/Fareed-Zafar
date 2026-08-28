/* Cart state — persisted to localStorage, no backend required. */

const CART_KEY = 'tajClothHouseCart_v1';

const Cart = {
  items: [],

  load() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      this.items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.items = [];
    }
    return this.items;
  },

  save() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(this.items));
    } catch (e) { /* storage unavailable — cart just won't persist */ }
    document.dispatchEvent(new CustomEvent('cart:updated'));
  },

  lineId(productId, size, color) {
    return `${productId}__${size || 'na'}__${color || 'na'}`;
  },

  add(product, size, color, qty = 1) {
    const lineId = this.lineId(product.id, size, color);
    const existing = this.items.find(i => i.lineId === lineId);
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({
        lineId,
        productId: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        size: size || null,
        color: color || null,
        qty
      });
    }
    this.save();
  },

  remove(lineId) {
    this.items = this.items.filter(i => i.lineId !== lineId);
    this.save();
  },

  setQty(lineId, qty) {
    const item = this.items.find(i => i.lineId === lineId);
    if (!item) return;
    item.qty = Math.max(1, Math.min(99, qty));
    this.save();
  },

  clear() {
    this.items = [];
    this.save();
  },

  count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  subtotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }
};

Cart.load();
