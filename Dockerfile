# DueChat — all-in-one app image
# Builds the TanStack Start app and serves it with Node 20.

FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install dependencies (lockfile-first for reproducible builds)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build the app. Supabase connection is baked in at build time via VITE_* vars.
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID=self-hosted
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public

EXPOSE 3000
# TanStack Start (Nitro) production server
CMD ["node", "dist/server/server.js"]
