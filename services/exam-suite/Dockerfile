# ============================================
# IOES - Exam Suite Dockerfile
# Node.js 20 + NestJS
# ============================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY services/exam-suite/package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY services/exam-suite/ ./

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Add non-root user
RUN addgroup -S ioes && adduser -S ioes -G ioes

# Copy package files
COPY services/exam-suite/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Set ownership
RUN chown -R ioes:ioes /app

USER ioes

# Expose port
EXPOSE 9005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9005/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
