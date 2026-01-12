FROM node:20-slim

# System deps for Playwright Chromium
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxshmfence1 \
  libxkbcommon0 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libxss1 \
  libxtst6 \
  libxinerama1 \
  libxcursor1 \
  libxi6 \
  libegl1 \
  libopengl0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first for layer caching
COPY server/package*.json ./server/
COPY web/package*.json ./web/

# Install deps
RUN cd server && npm ci
RUN cd web && npm ci

# Install Playwright browser
RUN cd server && npx playwright install chromium

# Copy source
COPY server ./server
COPY web ./web

# Build server + web
RUN cd server && npm run build
RUN cd web && npm run build

# Expose + run
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
