FROM ghcr.io/kubeasy-dev/app-docker-base@sha256:ecdc3b88fb3c699738b936e3812bf4c33f54a4600747ceee6d7a774141356e29 AS base

FROM ghcr.io/kubeasy-dev/app-docker-builder@sha256:2b5a10bdf5c39bf4f366e7a93710ef847a9b1eae46a3e5ea7162a4f4c25a4d9e AS builder

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
COPY --from=web-prepare --chown=tanstack:nodejs /app/out/full/apps/web/instrumentation.ts instrumentation.ts

USER tanstack
CMD ["node", "--import", "./instrumentation.ts", ".output/server/index.mjs"]

