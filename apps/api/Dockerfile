FROM ghcr.io/kubeasy-dev/app-docker-base@sha256:44f875d61f9731f47c08bad814610ef1b6c2915a92a191cb61ed9a4ccbb4bc41 AS base

FROM ghcr.io/kubeasy-dev/app-docker-builder@sha256:2b5a10bdf5c39bf4f366e7a93710ef847a9b1eae46a3e5ea7162a4f4c25a4d9e AS builder

FROM builder AS api-prepare

COPY . .
RUN turbo prune @kubeasy/api --docker

FROM builder AS api-builder

COPY --from=api-prepare /app/out/json/ .
RUN --mount=type=cache,id=s/9d68142a-20f6-467b-ae9e-d698d9f004d8-/root/.local/share/pnpm/store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY --from=api-prepare /app/out/full/ .
RUN --mount=type=cache,id=s/9d68142a-20f6-467b-ae9e-d698d9f004d8-/app/node_modules/.cache/turbo,target=/app/node_modules/.cache/turbo \
    turbo run build --filter=@kubeasy/api

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
