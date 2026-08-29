# Sehrish Builders — Website

A static, responsive website for **Sehrish Builders**, a building construction materials supplier in Keamari Town, Karachi. Built with plain HTML, JavaScript, and Tailwind CSS (via CDN) — no build step required.

**Only phone contact is used throughout the site (`tel:+923496693739`). There is no WhatsApp integration anywhere.**

## Running locally

Just serve the folder with any static file server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`.

## Structure

```
index.html          Home page: hero, trust highlights, categories, about, contact
products.html        Product catalog: search, category filter, sort, product details modal
css/style.css        Small custom styles (animations, scrollbar) layered on top of Tailwind
js/data.js           Product & category data
js/cart.js           Shopping cart logic (localStorage-backed)
js/site.js           Shared navbar / mobile menu / cart drawer behaviour
js/catalog.js        Product search, filtering, sorting, and details modal (products.html only)
```

## Notes

- Product images are loaded from Unsplash and Tailwind/Lucide icons load from their public CDNs — an internet connection is required for full styling and imagery.
- The `legacy-whatsapp-forwarder/` folder contains an unrelated pre-existing Node.js project that shipped with this repository before this website was built; it is untouched and unrelated to the Sehrish Builders site.
