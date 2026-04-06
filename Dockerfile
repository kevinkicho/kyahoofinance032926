# ── Stage 1: Build Vite frontend ─────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copy root package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app/server

# Copy server source and install production deps only
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

COPY server/ ./

# Copy Vite build output into a sibling dist/ so server can serve it
COPY --from=build /app/dist /app/dist

# Expose API + static serving port
EXPOSE 3001

# Runtime env vars are injected at container start — never bake .env into image
CMD ["node", "index.js"]
