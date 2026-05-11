FROM traefik:v3.7.0

RUN apk add --no-cache gettext

COPY apps/proxy/dynamic.yml /etc/traefik/dynamic.yml.template
COPY apps/proxy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Railway injecte PORT. On l'utilise pour tout.
ENV PORT=8080
ENV OTEL_COLLECTOR_GRPC_UPSTREAM=otel-collector.railway.internal:4317

ENTRYPOINT ["/entrypoint.sh"]
