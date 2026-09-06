# Website Images

This session's network policy blocks downloading the original Unsplash stock photos referenced earlier, so these are original abstract graphics generated to match the site's blue/purple brand palette instead — not stock photography. They're already wired into the HTML (`css` background images and `<img>` tags) via `images/<filename>`, so the site is fully self-contained with no external image dependencies.

| Filename | Used on |
|---|---|
| hero-tech-gradient.jpg | Hero background — Home, and the page-hero band on About, Services, SEO, Pricing, Contact |
| cta-gradient.jpg | "Ready to Take Your Business Digital?" CTA band — Home, Services, SEO, Digital Marketing, Content Writing, Website Creation, Pricing |
| about-team.jpg | About snippet image — Home, About |
| seo-analytics.jpg | SEO page hero and feature image |
| digital-marketing-social.jpg | Digital Marketing page hero and feature image |
| content-writing-notepad.jpg | Content Writing page hero and feature image |
| website-creation-design.jpg | Website Creation page hero and feature image |
| handshake.jpg | About page CTA band background |

Want real photography instead? Any royalty-free stock site (Unsplash, Pexels, Pixabay) works — replace the file in this folder (same filename) or update the `src`/`background-image` references in the HTML to point at your own images.
