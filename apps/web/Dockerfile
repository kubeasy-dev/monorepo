FROM ghcr.io/kubeasy-dev/app-docker-base@sha256:8383ff3543c7f32217597db2a364b3aee8efcade4beab321ec9e1fba156c06a9 AS base

FROM ghcr.io/kubeasy-dev/app-docker-builder@sha256:a633208e8431139b581bed97e7123d60443049eb6effab8e64dbde963aab2f7a AS builder

FROM builder AS web-prepare

COPY . .
RUN turbo prune @kubeasy/web --docker

FROM builder AS web-builder

COPY --from=web-prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=web-prepare /app/out/full/ .
RUN turbo run build --filter=@kubeasy/web

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tanstack

COPY --from=web-builder --chown=tanstack:nodejs /app/apps/web/.output .output
COPY --from=web-builder --chown=tanstack:nodejs /app/apps/web/package.json ./package.json

USER tanstack
CMD ["npm", "start"]
