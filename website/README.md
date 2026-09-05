# Supereaze Technologies Pvt. Ltd. — Website

A responsive, multi-page marketing website for Supereaze Technologies Pvt. Ltd., built with plain HTML, CSS and JavaScript (no build step, no frameworks).

## Structure

```
website/
  index.html               Home
  about.html                About Us
  services.html              Services overview
  seo.html                    SEO
  digital-marketing.html      Digital Marketing
  content-writing.html        Content Writing
  website-creation.html       Website Creation & Deployment
  pricing.html                Pricing (Basic / Professional / Business)
  contact.html                Contact Us + request form
  css/style.css              Shared stylesheet
  js/main.js                  Navigation, scroll reveal, form validation
```

## Running locally

No build tools are required. From this folder, serve the files with any static server, for example:

```bash
npx http-server -p 8080 .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploying to free hosting

This is a static site, so it can be deployed as-is to any static host:

- **Netlify / Vercel**: create a new site, point it at this `website/` folder (or the repo root if you move these files there), and deploy — no build command is needed.
- **GitHub Pages**: enable Pages for this repository and set the source to this folder (or copy its contents to the repo root / a `docs/` folder, depending on your Pages configuration).

## Notes

- Images are served directly from Unsplash's CDN (royalty-free, no attribution required).
- The contact form validates input in the browser and displays a confirmation message. It is not wired to a backend or email service — connect it to a form provider (e.g. Formspree, Netlify Forms) or your own backend if you need submissions delivered automatically.
- Payment method selection (JazzCash, EasyPaisa, Cash on Delivery) is collected on the contact form; actual payment processing (merchant account integration) is handled manually by the Supereaze Technologies team after a request is received, since this is a static front-end with no payment gateway credentials.
