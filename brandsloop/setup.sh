#!/usr/bin/env bash
# One-shot local setup for Brandsloop.
#   ./setup.sh          install, migrate, seed demo data
#   ./setup.sh --clean  same, but wipes the database first
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  # Generate a real signing secret rather than shipping a known one.
  SECRET=$(openssl rand -hex 48 2>/dev/null || head -c 48 /dev/urandom | od -An -tx1 | tr -d ' \n')
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=\"$SECRET\"|" server/.env && rm -f server/.env.bak
  echo "• Created server/.env with a freshly generated JWT_SECRET."
  echo "  Set SEED_ADMIN_PASSWORD in it, or let the seed print a random one."
fi

echo "• Installing dependencies…"
npm install

echo "• Applying database migrations…"
if [ "${1:-}" = "--clean" ]; then
  npm run db:reset --workspace=@brandsloop/server -- --force --skip-seed
else
  npx prisma migrate deploy --schema server/prisma/schema.prisma
fi

echo "• Seeding…"
npm run db:seed

cat <<'MSG'

Ready. Start it with:

  npm run dev        API on :4000, UI on :5173 (open http://localhost:5173)

or, for a production-style single server:

  npm run build && npm start   →  http://localhost:4000

MSG
