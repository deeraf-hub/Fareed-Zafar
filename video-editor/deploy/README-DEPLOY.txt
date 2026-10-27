Framewright video editor - production build (v0.4.0)
=====================================================

This folder is a ready-to-serve static website. Upload EVERYTHING in it
(including the hidden .htaccess, the assets/ and ffmpeg/ folders) to the
web root of your host. No Node.js, PHP or database is needed on the server.

Works on: cPanel / shared hosting (Apache), Nginx, Netlify (drag & drop this
folder), Cloudflare Pages, Vercel, GitHub Pages (root only), Firebase Hosting,
Amazon S3 + CloudFront, any static host.

Requirements
------------
1. HTTPS. Browsers only enable the video encoding APIs on https:// (or on
   http://localhost). Use your host's free Let's Encrypt certificate.
2. Domain root. The app was built for "/" (e.g. https://editor.example.com/),
   not a sub-folder like https://example.com/editor/. For a sub-folder,
   rebuild from source with: npm run build -- --base=/editor/
3. Single-page-app fallback: unknown paths must serve index.html.
   - Apache: the included .htaccess does this (mod_rewrite must be enabled).
   - Nginx: see nginx.conf.example (try_files ... /index.html).
   - Netlify / Cloudflare Pages: the included _redirects file does this.
4. The .wasm file must be served as application/wasm (handled in .htaccess
   and the Nginx example; most hosts already do this).

Accounts / cloud saving
-----------------------
This build runs in LOCAL MODE: no sign-in, projects are stored in the user's
browser. To enable accounts and cloud project sync, rebuild from source with
VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set (see docs/DEPLOYMENT.md in
the source zip), then upload the new build.

Size: about 33 MB, of which 32 MB is the FFmpeg engine (ffmpeg/ folder). It
is downloaded by the browser only when an export needs it.
