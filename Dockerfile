# Build stage
FROM node:20-bullseye AS builder

WORKDIR /app

# Install system dependencies needed for Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    chromium-browser \
    chromium \
    ca-certificates \
    fontconfig \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Runtime stage
FROM node:20-bullseye

WORKDIR /app

# Install only runtime dependencies for Chromium
RUN apt-get update && apt-get install -y \
    chromium-browser \
    chromium \
    ca-certificates \
    fontconfig \
    fonts-noto-cjk \
    libxss1 \
    libnss3 \
    libxkbcommon0 \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app
CMD ["node", "dist/server/index.js"]
