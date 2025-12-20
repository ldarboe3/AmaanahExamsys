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
    fonts-liberation \
    libappindicator3-1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libgtk-3-common \
    libharfbuzz0b \
    libicu67 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxinerama1 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libnspr4 \
    xdg-utils \
    wget \
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
    fonts-liberation \
    libappindicator3-1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libgtk-3-common \
    libharfbuzz0b \
    libicu67 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxinerama1 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libnspr4 \
    xdg-utils \
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
