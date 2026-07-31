# CoreSight Digital — Landing Page

A revamp of [coresight-digital.com](https://coresight-digital.com/) using the NovaAI
dark cinematic design: a full-viewport scroll-scrubbed video background, frosted
glass UI, white typography with drop shadows, and staggered fade-up reveals.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- lucide-react (icons)
- Inter (Google Fonts, weights 400/500/600/700)

## Run it

```bash
cd website
npm install
npm run dev      # http://localhost:5199
npm run build    # production build in dist/
```

## Editing the copy

All page text lives in a single file: [`src/content.ts`](src/content.ts).
The current copy is placeholder text written for CoreSight Digital — the live
site (coresight-digital.com) blocks automated access, so its exact wording
could not be pulled in. To use the real site copy, edit `src/content.ts` only;
no component or layout code needs to change:

- `brand` — logo wordmark and full company name
- `nav` — menu links and the top-right CTA
- `hero` — service list, intro, badge, headline, and the contact card
- `capability` — section two badge, headline, body, CTAs, and the three
  capability rows

## How the scroll video works

`src/components/ScrollVideo.tsx` renders a fixed full-bleed layer behind the
page (poster image → video → canvas). Page scroll maps to video progress
(smoothed with a lerp each animation frame). On load, an offscreen video
extracts up to 90 frames (max 960px wide) into an `ImageBitmap` cache; once
ready, the canvas scrubs those frames for perfectly smooth playback. Until
then (or if frame extraction fails, e.g. due to CORS), the visible `<video>`
element is seeked directly as a fallback. The video never autoplays — motion
is scroll-driven only.

Optional local mirrors for offline/dev reliability can be dropped into
`public/`:

- `public/hero.mp4` — same file as the CloudFront hero video
- `public/hero-poster.jpg` — first-frame still (used as the poster layer)
