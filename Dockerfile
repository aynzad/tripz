# syntax=docker/dockerfile:1

# ---- Base Stage ----
FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ---- Dependencies Stage ----
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# ---- Builder Stage ----
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create seed database during build
# This MUST succeed - we need a valid database for runtime
ENV DATABASE_URL="file:./prisma/seed.db"
RUN echo "Creating seed database during build..." && \
    mkdir -p ./prisma && \
    npx prisma db push && \
    node node_modules/tsx/dist/cli.mjs prisma/seed.ts && \
    echo "✓ Seed database created successfully" && \
    ls -la ./prisma/seed.db

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ---- Runner Stage ----
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set up the correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for runtime (client only - no CLI needed since DB is created at build time)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy runtime dependencies needed for Prisma client and database access
COPY --from=builder /app/node_modules/@next/env ./node_modules/@next/env
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3

# Copy seed database created during build (this is required - build will fail if it doesn't exist)
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.db ./prisma/seed.db

# Install su-exec for user switching
RUN apk add --no-cache su-exec

# Copy entrypoint script (owned by root so it can fix permissions)
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Don't switch to nextjs user here - entrypoint will handle it after fixing permissions
# USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
ENTRYPOINT ["./docker-entrypoint.sh"]
