# Deployment

Framewright is a static single-page app. Everything (editing, preview, MP4
encoding) runs in the visitor's browser, so hosting only has to serve files.
No server-side rendering, no paid APIs.

## 1. Supabase (optional, free tier)

Skip this section to ship in **local mode** (projects stored in the browser,
no accounts).

1. Create a project at <https://supabase.com> (Free plan).
2. **Authentication → Providers → Email**: keep *Email* enabled. For the
   smoothest onboarding, disable *Confirm email* during development; keep it
   enabled in production.
3. **Authentication → URL configuration**: set *Site URL* to your deployed
   origin (e.g. `https://framewright.pages.dev`) and add these *Redirect URLs*
   for every origin you use (production, previews, `http://localhost:5173`):
   `<origin>/projects` (Google sign-in) and `<origin>/reset-password`
   (password reset emails).
3b. **Google sign-in (optional)**: Authentication → Providers → Google: enable
   it and paste the OAuth client id/secret from Google Cloud Console (create an
   OAuth 2.0 Web client whose authorised redirect URI is the one Supabase
   shows on that screen, `https://<project>.supabase.co/auth/v1/callback`).
   Without this step the "Continue with Google" button reports that the
   provider is not enabled; email/password keeps working.
4. **SQL editor**: paste and run `supabase/migrations/0001_projects.sql`. It
   creates the `projects` table, a 50-projects-per-user cap, a 2 MB JSON size
   check and Row Level Security policies so users only see their own rows.
5. **Project settings → API**: copy the *Project URL* and the *anon public*
   key. Those two values are the only ones the frontend ever needs.

> **Never** put the `service_role` key in the frontend or in Cloudflare Pages
> build variables prefixed with `VITE_`. It bypasses RLS.

## 2. Cloudflare Pages (free)

1. Push the repository to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Settings:

   | Setting | Value |
   |---|---|
   | Framework preset | Vite (or None) |
   | Root directory | `video-editor` |
   | Build command | `npm ci && npm run build` |
   | Build output directory | `dist` |
   | Node version (env `NODE_VERSION`) | `22` |

4. Environment variables (Production *and* Preview):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Leave them unset for local
   mode.
5. Deploy. `public/_redirects` makes every route fall back to `index.html`
   (client-side routing) and `public/_headers` sets long cache lifetimes for the
   hashed assets and the FFmpeg core.

The FFmpeg.wasm core (~32 MB) is copied into `public/ffmpeg` by
`scripts/copy-ffmpeg-core.mjs` on `npm install`, so it is served from your own
origin. It is downloaded by the browser only when an export actually needs it
(software path or audio muxing).

### Alternatives

* **Netlify**: the repository root ships a `netlify.toml` (base
  `video-editor`, build `npm run build`, publish `dist`, Node 22), so a
  Netlify site connected to this repo builds the editor automatically and
  deploy previews are created for pull requests. `public/_redirects` and
  `public/_headers` are honoured as-is. Set the two `VITE_SUPABASE_*`
  variables in *Site configuration → Environment variables* for cloud mode.
* **Vercel**: root `video-editor`, framework Vite, add a rewrite of `/(.*)` to
  `/index.html`.
* **GitHub Pages**: works for a single-level path; set Vite `base` accordingly
  and use the 404.html fallback trick.

## 3. Local development (Windows, macOS, Linux)

```bash
cd video-editor
npm install          # also copies the FFmpeg core into public/ffmpeg
cp .env.example .env # optional: fill in Supabase values for cloud mode
npm run dev          # http://localhost:5173
```

Windows notes: use PowerShell or Git Bash; `copy .env.example .env` in cmd.
Chrome (or Edge) is the supported browser. WebCodecs hardware H.264 export is
available on Windows Chrome; other browsers fall back to FFmpeg.wasm
automatically.

## 4. Free-tier limits that are enforced

| Limit | Value | Where |
|---|---|---|
| Import file size | 500 MB | `LIMITS.maxImportFileBytes` |
| Assets / clips per project | 100 / 400 | `LIMITS` |
| Export length | 10 min | `LIMITS.maxExportSeconds` |
| Export resolution | 1080p / 720p / 480p (short side) | `EXPORT_PRESETS` |
| Projects (local / cloud) | 50 / 50 | `LIMITS` + SQL trigger |
| Project JSON size | 2 MB | client + SQL check |

Media is never uploaded, so Supabase storage usage is zero. If cloud media
uploads are added later, `LIMITS.cloud` already defines upload size, per-user
storage and processing caps to wire into the backend.
