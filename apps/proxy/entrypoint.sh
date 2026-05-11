#!/bin/sh
set -e

# Liste des variables à injecter
VARS='$PORT:$API_UPSTREAM:$DOCS_UPSTREAM:$ADMIN_UPSTREAM:$WEB_UPSTREAM:$OTEL_COLLECTOR_UPSTREAM:$OTEL_COLLECTOR_GRPC_UPSTREAM'

# Génération de la config dynamique
envsubst "$VARS" < /etc/traefik/dynamic.yml.template > /etc/traefik/dynamic.yml

# Lancement de Traefik avec deux entrypoints :
# - web (8080) pour le trafic public
# - health (${PORT}) pour le healthcheck Railway
exec traefik \
  --entryPoints.web.address=":8080" \
  --entryPoints.health.address=":${PORT}" \
  --providers.file.filename=/etc/traefik/dynamic.yml \
  --ping=true \
  --ping.entryPoint=health \
  --log.level=INFO \
  --accesslog=true \
  --api.dashboard=false \
  --tracing.otlp.grpc.endpoint="${OTEL_COLLECTOR_GRPC_UPSTREAM}" \
  --tracing.otlp.grpc.insecure=true
