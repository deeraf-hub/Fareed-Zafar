#!/bin/sh
# Brings the database up to date and makes sure there is an account to sign in
# with, so `docker compose up` is genuinely all that is needed.
set -e

echo "→ Applying database migrations…"
npx prisma migrate deploy --schema server/prisma/schema.prisma

# The seed skips anything that already exists, so this is safe on every boot.
echo "→ Seeding…"
npx tsx server/prisma/seed.ts

echo "→ Starting Brandsloop on port ${PORT:-4000}"
exec node server/dist/index.js
