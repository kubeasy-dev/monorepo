FROM ghcr.io/kubeasy-dev/app-docker-base@sha256:8383ff3543c7f32217597db2a364b3aee8efcade4beab321ec9e1fba156c06a9 AS base

FROM ghcr.io/kubeasy-dev/app-docker-builder@sha256:a633208e8431139b581bed97e7123d60443049eb6effab8e64dbde963aab2f7a AS builder

FROM builder AS web-prepare

COPY . .
RUN turbo prune @kubeasy/web --docker

FROM builder AS web-builder

COPY --from=web-prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=web-prepare /app/out/full/ .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

ARG NOTION_INTEGRATION_TOKEN
ENV NOTION_INTEGRATION_TOKEN=$NOTION_INTEGRATION_TOKEN
ARG NOTION_BLOG_DATASOURCE_ID
ENV NOTION_BLOG_DATASOURCE_ID=$NOTION_BLOG_DATASOURCE_ID
ARG NOTION_DIRECTORY_DATASOURCE_ID
ENV NOTION_DIRECTORY_DATASOURCE_ID=$NOTION_DIRECTORY_DATASOURCE_ID
ARG NOTION_PEOPLE_DATASOURCE_ID
ENV NOTION_PEOPLE_DATASOURCE_ID=$NOTION_PEOPLE_DATASOURCE_ID

RUN turbo run build --filter=@kubeasy/web

FROM web-builder AS web-deploy

RUN pnpm --filter @kubeasy/web deploy --prod --legacy /app/deployed

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tanstack

COPY --from=web-builder --chown=tanstack:nodejs /app/apps/web/.output .output
COPY --from=web-deploy --chown=tanstack:nodejs /app/deployed/node_modules node_modules
COPY --from=web-prepare --chown=tanstack:nodejs /app/out/full/apps/web/otel.mjs otel.mjs

USER tanstack
CMD ["node", "--import", "./otel.mjs", ".output/server/index.mjs"]

