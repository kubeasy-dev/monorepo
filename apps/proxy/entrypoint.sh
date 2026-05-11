#!/bin/sh
set -e

# Liste explicite des variables à remplacer pour éviter de corrompre les @internal de Traefik
VARS='$PORT:$API_UPSTREAM:$DOCS_UPSTREAM:$ADMIN_UPSTREAM:$WEB_UPSTREAM:$OTEL_COLLECTOR_UPSTREAM:$OTEL_COLLECTOR_GRPC_UPSTREAM:$DYNAMIC_CONFIG_PATH'

# Définition des chemins
export TRAEFIK_TEMPLATE=${TRAEFIK_TEMPLATE:-/traefik.yml.template}
export DYNAMIC_TEMPLATE=${DYNAMIC_TEMPLATE:-/dynamic.yml.template}
export TRAEFIK_CONFIG=${TRAEFIK_CONFIG:-/traefik.yml}
export DYNAMIC_CONFIG=${DYNAMIC_CONFIG:-/dynamic.yml}
export DYNAMIC_CONFIG_PATH=$DYNAMIC_CONFIG

# Substitution ciblée
envsubst "$VARS" < "$TRAEFIK_TEMPLATE" > "$TRAEFIK_CONFIG"
envsubst "$VARS" < "$DYNAMIC_TEMPLATE" > "$DYNAMIC_CONFIG"

echo "--- Generated traefik.yml ---"
cat "$TRAEFIK_CONFIG"
echo "----------------------------"

exec traefik --configFile="$TRAEFIK_CONFIG"
