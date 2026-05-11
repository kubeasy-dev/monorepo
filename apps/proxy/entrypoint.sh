#!/bin/sh
set -e

# Liste des variables à injecter
VARS='$PORT:$API_UPSTREAM:$DOCS_UPSTREAM:$ADMIN_UPSTREAM:$WEB_UPSTREAM:$OTEL_COLLECTOR_UPSTREAM:$OTEL_COLLECTOR_GRPC_UPSTREAM'

# Génération de la config dynamique
envsubst "$VARS" < /etc/traefik/dynamic.yml.template > /etc/traefik/dynamic.yml

# Lancement de Traefik avec config en ligne de commande (robuste)
exec traefik \
  --entryPoints.web.address=":${PORT}" \
  --providers.file.filename=/etc/traefik/dynamic.yml \
  --ping=true \
  --ping.entryPoint=web \
  --log.level=INFO \
  --accesslog=true \
  --api.dashboard=false \
  --tracing.otlp.grpc.endpoint="${OTEL_COLLECTOR_GRPC_UPSTREAM}" \
  --tracing.otlp.grpc.insecure=true
