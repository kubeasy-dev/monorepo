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

FROM nginx:alpine AS runner

COPY --from=admin-builder /app/apps/admin/dist /usr/share/nginx/html/admin
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
