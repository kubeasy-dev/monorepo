FROM caddy:builder@sha256:10ed0251c5cd1dbb4db0b71ad43121147961a51adfec35febce2c93ea25c24f4 AS caddy-builder

ARG CADDY_PLUGINS=

COPY --chmod=755 apps/caddy/build.sh /build.sh
RUN sh /build.sh

FROM ghcr.io/kubeasy-dev/app-docker-builder@sha256:a633208e8431139b581bed97e7123d60443049eb6effab8e64dbde963aab2f7a AS node-builder

FROM node-builder AS admin-prepare
COPY . .
RUN turbo prune @kubeasy/admin --docker

FROM node-builder AS admin-builder

COPY --from=admin-prepare /app/out/json/ .

RUN pnpm install --frozen-lockfile

COPY --from=admin-prepare /app/out/full/ .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN turbo run build --filter=@kubeasy/admin

FROM caddy:alpine@sha256:834468128c7696cec0ceea6172f7d692daf645ae51983ca76e39da54a97c570d AS runner

COPY --from=caddy-builder /usr/local/bin/caddy-custom /usr/bin/caddy
COPY apps/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=admin-builder /app/apps/admin/dist /admin

EXPOSE 8080
EXPOSE 2019