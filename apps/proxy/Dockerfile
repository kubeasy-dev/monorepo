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

FROM nginx:otel@sha256:2ab7628dd551c34589a322e84a81da8b8c61fdf199731b549526ff8965cc4799 AS runner

COPY --from=admin-builder /app/apps/admin/dist /admin
COPY apps/proxy/nginx.conf /etc/nginx/nginx.conf
COPY apps/proxy/default.conf.template /etc/nginx/templates/default.conf.template

# Defaults — overridden by Railway env vars at runtime
ENV OTEL_COLLECTOR_UPSTREAM=otel-collector:4318 \
    OTEL_COLLECTOR_GRPC_UPSTREAM=otel-collector:4317 \
    PORT=8080

EXPOSE 8080
