FROM caddy:builder AS builder

ARG CADDY_PLUGINS=

COPY --chmod=755 apps/caddy/build.sh /build.sh
RUN sh /build.sh

FROM node:22-alpine AS admin-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ packages/
COPY apps/admin/ apps/admin/

# Install workspace deps needed for admin build
RUN pnpm install --frozen-lockfile

# Build the SPA (tsc --noEmit && vite build)
WORKDIR /app/apps/admin
RUN pnpm build

FROM caddy:alpine

COPY --from=builder /usr/local/bin/caddy-custom /usr/bin/caddy
COPY apps/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=admin-builder /app/apps/admin/dist /admin

EXPOSE 8080
EXPOSE 2019