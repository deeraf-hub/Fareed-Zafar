/* Cart state — persisted to localStorage, shared across every page. */
const Cart = (() => {
  const KEY = "mc_cart_v1";
  const listeners = [];

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function write(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable (private mode, quota) — cart just won't persist */
    }
    listeners.forEach((fn) => fn(state));
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function getState() {
    return read();
  }

  function add(id, qty = 1) {
    const state = read();
    state[id] = (state[id] || 0) + qty;
    write(state);
  }

  function setQty(id, qty) {
    const state = read();
    if (qty <= 0) {
      delete state[id];
    } else {
      state[id] = qty;
    }
    write(state);
  }

  function remove(id) {
    const state = read();
    delete state[id];
    write(state);
  }

  function clear() {
    write({});
  }

  function count() {
    const state = read();
    return Object.values(state).reduce((sum, q) => sum + q, 0);
  }

  function lines(products) {
    const state = read();
    return Object.entries(state)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        return product ? { product, qty } : null;
      })
      .filter(Boolean);
  }

  function subtotal(products) {
    return lines(products).reduce((sum, l) => sum + l.product.price * l.qty, 0);
  }

  return { getState, add, setQty, remove, clear, count, lines, subtotal, onChange };
})();
