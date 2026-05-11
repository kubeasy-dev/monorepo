#!/bin/sh
set -e

# Replace environment variables in Traefik static and dynamic config
# We use a temporary file to avoid envsubst reading and writing to the same file if needed, 
# but here we are going from .template to .yml so it's fine.
envsubst < /traefik.yml.template > /traefik.yml
envsubst < /dynamic.yml.template > /dynamic.yml

# Print generated config for debugging
echo "--- Generated traefik.yml ---"
cat /traefik.yml
echo "----------------------------"

# Start Traefik
exec traefik --configFile=/traefik.yml
