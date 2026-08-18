# Brandsloop Inventory — one image running the API and serving the built UI.
#
# `prisma` and `tsx` are runtime dependencies, not dev ones: the container
# applies migrations and seeds itself on boot, so both must survive the
# production install.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

COPY server ./server
COPY client ./client
RUN npx prisma generate --schema server/prisma/schema.prisma \
 && npm run build --workspace=@brandsloop/client \
 && npx tsc -p server/tsconfig.json

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --omit=dev

# The schema is needed at runtime for `migrate deploy`; the seed scripts and
# the compiled sources they import come across too.
COPY server/prisma ./server/prisma
COPY server/src ./server/src
COPY server/tsconfig.json ./server/
RUN npx prisma generate --schema server/prisma/schema.prisma

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
CMD ["./docker-entrypoint.sh"]
