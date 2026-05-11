FROM traefik:v3.7.0

COPY apps/proxy/dynamic.yml /etc/traefik/dynamic.yml

# Default environment variables for local testing
ENV PORT=8080 \
    API_UPSTREAM=http://api:3000 \
    DOCS_UPSTREAM=http://docs:3000 \
    ADMIN_UPSTREAM=http://admin:80 \
    WEB_UPSTREAM=http://web:3000 \
    OTEL_COLLECTOR_UPSTREAM=http://otel-collector:4318 \
    OTEL_COLLECTOR_GRPC_UPSTREAM=otel-collector:4317

# On utilise les arguments CLI pour la config statique (port, etc.)
# Traefik v3 gère automatiquement le ping sur /ping si on l'active
CMD traefik \
    --entryPoints.web.address=":${PORT}" \
    --providers.file.filename=/etc/traefik/dynamic.yml \
    --providers.file.watch=true \
    --ping=true \
    --ping.entryPoint=web \
    --log.level=DEBUG \
    --accesslog=true \
    --api.dashboard=false \
    --tracing.otlp.grpc.endpoint="${OTEL_COLLECTOR_GRPC_UPSTREAM}" \
    --tracing.otlp.grpc.insecure=true
