FROM traefik:v3.7.0

RUN apk add --no-cache gettext

# On copie le template qui sera transformé par envsubst au démarrage
COPY apps/proxy/dynamic.yml.template /etc/traefik/dynamic.yml.template
COPY apps/proxy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Railway injecte PORT (pour le healthcheck).
ENV PORT=8081
ENV OTEL_COLLECTOR_GRPC_UPSTREAM=otel-collector.railway.internal:4317

ENTRYPOINT ["/entrypoint.sh"]
