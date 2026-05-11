#!/bin/sh

# Replace environment variables in Traefik static and dynamic config
envsubst < /etc/traefik/traefik.yml.template > /etc/traefik/traefik.yml
envsubst < /etc/traefik/dynamic.yml.template > /etc/traefik/dynamic.yml

# Start Traefik
exec traefik --configFile=/etc/traefik/traefik.yml
