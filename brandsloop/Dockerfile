# Brandsloop Inventory — single image running the API and serving the built UI.
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

COPY server/prisma ./server/prisma
RUN npx prisma generate --schema server/prisma/schema.prisma
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 4000
# Migrations are applied on boot so a fresh database is ready to use.
CMD ["sh", "-c", "npx prisma migrate deploy --schema server/prisma/schema.prisma && node server/dist/index.js"]
