FROM ghcr.io/kubeasy-dev/app-docker-base@sha256:8383ff3543c7f32217597db2a364b3aee8efcade4beab321ec9e1fba156c06a9 AS base

FROM ghcr.io/kubeasy-dev/app-docker-builder@sha256:a633208e8431139b581bed97e7123d60443049eb6effab8e64dbde963aab2f7a AS builder

FROM builder AS docs-prepare

COPY . .
RUN turbo prune @kubeasy/docs --docker

FROM builder AS docs-builder

COPY --from=docs-prepare /app/out/json/ .
COPY --from=docs-prepare /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=docs-prepare /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --from=docs-prepare /app/out/full/apps/docs/source.config.ts ./apps/docs/source.config.ts

RUN --mount=type=cache,id=s/4971b9dc-4b63-4444-8519-2bcb17fbfbc1-/root/.local/share/pnpm/store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY --from=docs-prepare /app/out/full/ .

ARG NEXT_PUBLIC_UMAMI_URL
ENV NEXT_PUBLIC_UMAMI_URL=$NEXT_PUBLIC_UMAMI_URL
ARG NEXT_PUBLIC_UMAMI_ID
ENV NEXT_PUBLIC_UMAMI_ID=$NEXT_PUBLIC_UMAMI_ID

RUN --mount=type=cache,id=s/4971b9dc-4b63-4444-8519-2bcb17fbfbc1-/app/node_modules/.cache/turbo,target=/app/node_modules/.cache/turbo \
    --mount=type=cache,id=s/4971b9dc-4b63-4444-8519-2bcb17fbfbc1-/app/apps/docs/.next/cache,target=/app/apps/docs/.next/cache \
    turbo run build --filter=@kubeasy/docs

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=docs-builder --chown=nextjs:nodejs /app/apps/docs/.next/standalone ./
COPY --from=docs-builder --chown=nextjs:nodejs /app/apps/docs/.next/static ./apps/docs/.next/static
COPY --from=docs-builder --chown=nextjs:nodejs /app/apps/docs/next.config.mjs ./apps/docs/next.config.mjs
COPY --from=docs-builder --chown=nextjs:nodejs /app/apps/docs/source.config.ts ./apps/docs/source.config.ts
COPY --from=docs-builder --chown=nextjs:nodejs /app/apps/docs/public ./apps/docs/public
COPY --from=docs-builder --chown=nextjs:nodejs /app/apps/docs/openapi-registry.json ./apps/docs/openapi-registry.json

USER nextjs
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/docs/server.js"]