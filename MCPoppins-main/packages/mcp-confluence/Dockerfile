FROM node:20-slim AS base
WORKDIR /app
RUN addgroup --system mcp && adduser --system --ingroup mcp mcp

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts

COPY src/ ./src/
COPY docs/ ./docs/
COPY README.md SECURITY.md CHANGELOG.md LICENSE ./

USER mcp
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "process.exit(0)"

ENTRYPOINT ["node", "src/index.js"]
