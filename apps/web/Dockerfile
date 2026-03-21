FROM node:22-alpine AS prepare
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN npm install -g turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @kubeasy/web --docker

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=prepare /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN pnpm turbo run build --filter=@kubeasy/web

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /app/apps/web/dist ./dist
USER appuser
EXPOSE 3000
CMD ["node", "dist/server/server.js"]
