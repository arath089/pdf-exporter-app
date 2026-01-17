FROM node:20-slim

# Let Playwright store browsers here
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production

# Install deps for Playwright/Chromium
RUN apt-get update && apt-get install -y \
  ca-certificates \
  wget \
  gnupg \
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
  libdbus-1-3 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package*.json ./server/
COPY web/package*.json ./web/

RUN cd server && npm ci
RUN cd web && npm ci

# Install browsers into /ms-playwright
RUN cd server && npx playwright install chromium

# Copy source
COPY server ./server
COPY web ./web

# Build
RUN cd server && npm run build
RUN cd web && npm run build

# Ensure tmp exists for persistent profile
RUN mkdir -p /tmp/pw-profile && chmod -R 777 /tmp

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
