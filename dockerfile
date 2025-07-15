# syntax=docker/dockerfile:1.4

FROM node:23-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++ && \
    echo "optional=false" >> ~/.npmrc && \
    echo "fund=false" >> ~/.npmrc && \
    echo "audit=false" >> ~/.npmrc

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

FROM node:23-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig*.json ./

COPY src ./src

RUN npm run build && \
    npm prune --production && \
    find node_modules -type f -not -name "*.node" \
      \( -name "*.md" -o -name "LICENSE" -o -name "AUTHORS*" \
         -o -name "CHANGELOG*" -o -name "*.npmignore" \
         -o -name ".travis.yml" -o -name ".gitignore" \
         -o -name ".editorconfig" \) -delete || true

FROM node:23-alpine AS runner

RUN apk add --no-cache dumb-init wget

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs --ingroup nodejs

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs
RUN mkdir -p /app/logs

USER root
RUN chown -R nodejs:nodejs /app/logs && \
    chmod -R 755 /app/logs

USER nodejs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

WORKDIR /app

CMD ["node", "dist/main.js"]