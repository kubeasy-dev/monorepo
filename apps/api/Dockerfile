FROM node:22-alpine AS prepare
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN npm install -g turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @kubeasy/api --docker

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=prepare /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN pnpm turbo run build --filter=@kubeasy/api

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=appuser:appgroup /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/packages ./packages
USER appuser
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "--import", "./dist/instrumentation.js", "dist/index.js"]
