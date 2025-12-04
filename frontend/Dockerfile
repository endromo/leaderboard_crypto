# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies berdasarkan OS yang optimal
RUN apk add --no-cache libc6-compat

# Copy package files
# COPY package.json package-lock.json* ./
COPY package*.json ./

# Install dependencies dengan cache optimization
RUN npm ci --omit=dev --ignore-scripts 

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git curl

# Copy dependencies dari stage sebelumnya
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment variables untuk build
ENV NEXT_TELEMETRY_DISABLED=1
# ENV NODE_ENV=production
ENV NODE_ENV=development

# Build application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application dari builder
COPY --from=builder /app/public ./public

# Set the correct permission untuk Next.js cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces untuk mengurangi image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy other necessary files
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./

# Switch ke non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# ENV NODE_ENV=production
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "server.js"]