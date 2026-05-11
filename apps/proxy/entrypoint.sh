#!/bin/sh
set -e

# Define paths (can be overridden for local testing)
export TRAEFIK_TEMPLATE=${TRAEFIK_TEMPLATE:-/traefik.yml.template}
export DYNAMIC_TEMPLATE=${DYNAMIC_TEMPLATE:-/dynamic.yml.template}
export TRAEFIK_CONFIG=${TRAEFIK_CONFIG:-/traefik.yml}
export DYNAMIC_CONFIG=${DYNAMIC_CONFIG:-/dynamic.yml}

# This variable is used inside traefik.yml.template to point to the generated dynamic config
export DYNAMIC_CONFIG_PATH=$DYNAMIC_CONFIG

# Perform substitution
envsubst < "$TRAEFIK_TEMPLATE" > "$TRAEFIK_CONFIG"
envsubst < "$DYNAMIC_TEMPLATE" > "$DYNAMIC_CONFIG"

echo "--- Generated traefik.yml ---"
cat "$TRAEFIK_CONFIG"
echo "----------------------------"

echo "--- Generated dynamic.yml ---"
cat "$DYNAMIC_CONFIG"
echo "----------------------------"

# Only start traefik if it exists (allows testing script alone)
if command -v traefik >/dev/null 2>&1; then
    exec traefik --configFile="$TRAEFIK_CONFIG"
else
    echo "Traefik binary not found, skipping exec."
fi
