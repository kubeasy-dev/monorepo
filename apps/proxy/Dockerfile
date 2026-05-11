FROM traefik:v3.7.0

# Install envsubst (gettext package in alpine)
RUN apk add --no-cache gettext

COPY apps/proxy/traefik.yml.template /traefik.yml.template
COPY apps/proxy/dynamic.yml.template /dynamic.yml.template
COPY apps/proxy/entrypoint.sh /entrypoint.sh

# Default environment variables
ENV PORT=8080 \
    API_UPSTREAM=http://api:3000 \
    DOCS_UPSTREAM=http://docs:3000 \
    ADMIN_UPSTREAM=http://admin:80 \
    WEB_UPSTREAM=http://web:3000 \
    OTEL_COLLECTOR_UPSTREAM=otel-collector:4318 \
    OTEL_COLLECTOR_GRPC_UPSTREAM=otel-collector:4317

ENTRYPOINT ["/entrypoint.sh"]
