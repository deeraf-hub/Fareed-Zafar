# Hand Tools Trading Corporation — E-commerce Website

A modern, industrial-styled e-commerce website for **Hand Tools Trading Corporation**, a hardware and hand tools supplier based in Lahore, Pakistan.

## Tech Stack

- **React 18** + **React Router** for routing
- **Vite** for the build tool / dev server
- **Tailwind CSS v4** for styling
- **lucide-react** for icons

## Features

- Sticky header with search overlay, cart drawer and mobile navigation
- Homepage with hero, featured categories, popular products, why-choose-us, about and contact sections
- Shop page with search, category filter, price range filter and sorting (featured / price / name / newest)
- Product details page with specs, quantity selector, add-to-cart and buy-now
- Fully working shopping cart (add / remove / update quantity), persisted in `localStorage`
- Checkout page that submits an order **request** (Cash on Delivery, JazzCash or EasyPaisa — no online payment gateway is connected)
- Categories, About, Contact (with embedded map), Privacy Policy, Terms & Conditions, and 404 / product-not-found pages
- Responsive layout for desktop, tablet and mobile

## Getting Started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Project Structure

```
src/
  components/
    common/     Logo, Rating, Badge, QuantitySelector
    layout/     Header, Footer, MobileMenu, Breadcrumbs, BackToTop, Layout
    home/       Hero, CategoryCard, FeaturedCategories, FeaturedProducts,
                WhyChooseUs, AboutSection, Testimonials, ContactSection
    shop/       ProductCard, ProductGrid, Filters, SortDropdown, SearchOverlay
    cart/       CartDrawer, CartItemRow
  context/      CartContext (cart state + localStorage persistence)
  data/         business.js, categories.js, products.js, images.js
  lib/          format.js (PKR currency formatting, slugify)
  pages/        Home, Shop, ProductDetails, Categories, About, Contact,
                Cart, Checkout, OrderSuccess, Privacy, Terms, NotFound, ProductNotFound
```

## Business Information

- **Name:** Hand Tools Trading Corporation
- **Address:** 14th Floor, Arif Centre, Lahore, Pakistan
- **Phone:** +92 321 4387690
