FROM ghcr.io/kubeasy-dev/app-docker-base@sha256:8383ff3543c7f32217597db2a364b3aee8efcade4beab321ec9e1fba156c06a9 AS base

FROM ghcr.io/kubeasy-dev/app-docker-builder@sha256:a633208e8431139b581bed97e7123d60443049eb6effab8e64dbde963aab2f7a AS builder

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
