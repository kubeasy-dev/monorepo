FROM node:22-alpine AS base

# 1. Préparation (isole uniquement les paquets nécessaires pour docs)
FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN npm install -g turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @kubeasy/docs --docker

# 2. Installation et Build
FROM base AS installer
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=@kubeasy/docs

# 3. Production runner (ultra léger)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Le mode standalone de Next.js préserve la structure du monorepo
COPY --from=installer --chown=nextjs:nodejs /app/apps/docs/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/docs/.next/static ./apps/docs/.next/static

# Copy config files needed by Fumadocs at runtime
COPY --from=installer --chown=nextjs:nodejs /app/apps/docs/next.config.mjs ./apps/docs/next.config.mjs
COPY --from=installer --chown=nextjs:nodejs /app/apps/docs/source.config.ts ./apps/docs/source.config.ts

# Si vous avez un dossier public, décommentez la ligne ci-dessous :
COPY --from=installer --chown=nextjs:nodejs /app/apps/docs/public ./apps/docs/public

USER nextjs

ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/docs/server.js"]