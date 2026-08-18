# Brandsloop — quick start

Two ways to run it. Both were tested from this exact zip on a clean machine.

---

## Option A — Docker (nothing else to install)

```bash
docker compose up --build
```

Open **http://localhost:4000**.

That single command starts PostgreSQL, applies the database migrations, seeds
the admin account and a demo catalogue, then serves the app. Watch the terminal
output for the admin password — it is printed once, when the account is created:

```
──────────────────────────────────────────────
  Brandsloop admin account created
  Email:    admin@brandsloop.pk
  Password: BlXXXXXXXXXXXX9
──────────────────────────────────────────────
```

To choose your own password instead, set it before the first run:

```bash
SEED_ADMIN_PASSWORD='YourPassword123' docker compose up --build
```

Stop with `Ctrl-C`. Data persists in a Docker volume; `docker compose down -v`
wipes it and starts fresh.

---

## Option B — Node + PostgreSQL

Needs **Node 20+** and **PostgreSQL 14+** already running.

```bash
createdb brandsloop     # or point DATABASE_URL at any empty database
./setup.sh              # installs, writes server/.env, migrates, seeds
npm run dev
```

Open **http://localhost:5173**. The admin password is printed by the seed step.

On Windows, run `setup.sh` from Git Bash or WSL — or do the same three steps by
hand:

```bash
cp server/.env.example server/.env     # then edit DATABASE_URL and JWT_SECRET
npm install
npm run db:deploy --workspace=@brandsloop/server
npm run db:seed
npm run dev
```

### Production-style single server

```bash
npm run build && npm start
```

Serves the API and the built interface together on **http://localhost:4000**.

---

## Before anyone else can reach it

The defaults are safe for a laptop, not for the open internet. Before exposing
it:

1. **Set a real `JWT_SECRET`** in `server/.env`. `setup.sh` generates one; if
   you wrote the file by hand, use `openssl rand -hex 48`. The server refuses to
   start in production with a default or short secret.
2. **Change the admin password** after first sign-in (avatar menu → Change
   password), and set `SEED_DEMO_DATA=false` so the demo catalogue is not
   created on a real database.
3. **Set `COOKIE_SECURE=true`** once you are serving over HTTPS, and put
   `CORS_ORIGINS` to your real domain.
4. **Use a real database password.** The compose file ships `brandsloop` /
   `brandsloop` for local convenience.

---

## Roles to try

The demo seed creates three accounts so you can see permissions change. The
manager and staff passwords are printed by the seed alongside the admin one.

| | Admin | Manager | Staff |
|---|---|---|---|
| Sales, receiving stock, returns | ✅ | ✅ | ✅ |
| Editing products and suppliers | ✅ | ✅ | — |
| Deleting, adjusting, transferring | ✅ | ✅ | — |
| Profit and financial reports | ✅ | ✅ | — |
| Users, settings, audit log | ✅ | — | — |

---

## If something goes wrong

**`ECONNREFUSED` / cannot reach the database** — PostgreSQL is not running, or
`DATABASE_URL` in `server/.env` points somewhere else. Check with
`pg_isready`.

**`Environment variable not found: DATABASE_URL`** — `server/.env` is missing.
Copy `server/.env.example` to `server/.env`.

**Port already in use** — change `PORT` in `server/.env` (Option B), or the
left-hand side of `"4000:4000"` in `docker-compose.yml` (Option A).

**Login says the password is wrong** — the seed only prints it when it creates
the account. To reset: `npm run db:reset --workspace=@brandsloop/server` wipes
the database and re-seeds. Do not do that on real data.

Full documentation is in `README.md`.
