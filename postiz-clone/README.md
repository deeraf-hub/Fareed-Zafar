# Postiz clone — social media scheduling tool

A front-end clone of [postiz.com](https://postiz.com): the marketing site **and** the scheduling app, built with Next.js 16, React 19 and Tailwind CSS 4. The product name is `Postio` by default and lives in one file (`src/lib/brand.ts`) so you can rename it.

Everything runs in the browser with demo data persisted to `localStorage`. There is no backend, no real OAuth and no real publishing; the point is a faithful, fully clickable UI you can build a real backend behind.

## What's included

**Marketing site**

- `/` — hero with an animated dashboard mock-up, trusted-by marquee, 8 feature cards, 24-platform channel grid, how-it-works, pricing (monthly/yearly toggle), testimonials, FAQ accordion, CTA, footer
- `/pricing` — Standard / Team / Pro / Ultimate plans, FAQ and CTA
- `/auth/login`, `/auth/register` — mock sign-in (any email + password, or the GitHub/Google buttons)

**App** (requires sign-in; unauthenticated visits redirect to login)

- `/launches` — the calendar. Day / week / month views, status filter and customer filter, **drag-and-drop rescheduling**, click any slot to create a post
- Post composer — multi-channel picker with per-provider character limits, threads/comments, demo media picker, signatures, sets, AI Copilot (demo text generator), per-channel text overrides, live platform-styled preview, team comments, schedule / repeat / tags, save draft / post now / add to calendar, duplicate and delete
- `/analytics` — stat tiles, follower growth line chart, impressions bar chart, best-time-to-post heatmap, reach by weekday, top posts table (table view toggle on charts)
- `/plugs` — per-channel automations: auto-repost, auto-plug comment, cross-post
- `/marketplace` — buy sponsored posts from creators, order tracking
- `/settings` — channels (enable/disable, preferred, customer grouping, disconnect), team invites and roles, webhooks, RSS auto-posting, signatures, sets, public API key with curl quick-start, reset demo data
- `/billing` — current plan, usage meters, plan switching, invoices
- Add-channel modal with all 24 providers grouped by category and plan limits enforced

## Run it

```bash
cd postiz-clone
npm install
npm run dev
```

Open http://localhost:3000. For a production build:

```bash
npm run build
npm start
```

## Project layout

```
src/
  app/                 routes (App Router)
    page.tsx           landing page
    pricing/           pricing page
    auth/login|register
    (app)/             authenticated area wrapped by the Shell layout
      launches/ analytics/ plugs/ marketplace/ settings/ billing/
  components/
    landing/           Navbar, Hero & sections, Pricing, Footer, AuthForm
    app/               Shell (sidebar/topbar), Calendar, Composer, Preview, Charts, Settings, AddChannelModal
    ui/                Button, Modal, Badge, Toggle, Field…, ProviderBadge, ChannelAvatar
  lib/
    brand.ts           product name / links (rename here)
    types.ts           data model
    data.ts            providers, plans, copy, seed posts
    store.tsx          React context store with localStorage persistence
    utils.ts
```

## Turning it into a real product

The store in `src/lib/store.tsx` is the only place state is mutated, so swapping the in-memory implementation for API calls is a contained change. The upstream Postiz architecture is a good reference: Next.js front end, NestJS API, PostgreSQL via Prisma, Redis-backed workers that call each provider's API at publish time, and OAuth per provider for the "Add channel" flow.

Copy, pricing, testimonials, logos and analytics numbers are placeholders written for this clone, not Postiz's actual figures.
