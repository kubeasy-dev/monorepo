FROM ghcr.io/kubeasy-dev/app-docker-base@sha256:6e8343a2e2dc041f0a3feeafeb983b1403769df51bbb8788d9ec31901ef61f52 AS base

FROM ghcr.io/kubeasy-dev/app-docker-builder@sha256:2b5a10bdf5c39bf4f366e7a93710ef847a9b1eae46a3e5ea7162a4f4c25a4d9e AS builder

FROM builder AS api-prepare

COPY . .
RUN turbo prune @kubeasy/api --docker

FROM builder AS api-builder

COPY --from=api-prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=api-prepare /app/out/full/ .
RUN turbo run build --filter=@kubeasy/api

FROM api-builder AS api-deploy

RUN pnpm --filter @kubeasy/api deploy --legacy --prod /app/deployed

FROM base AS runner 

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

ENV PORT=3001
EXPOSE 3001

COPY --from=api-builder --chown=hono:nodejs /app/apps/api/dist dist
COPY --from=api-deploy --chown=hono:nodejs /app/deployed/node_modules node_modules

COPY --from=api-prepare --chown=hono:nodejs /app/apps/api/drizzle drizzle

USER hono

CMD ["node", "dist/index.js"]
