FROM traefik:v3.7.0

COPY apps/proxy/traefik.yml /traefik.yml
COPY apps/proxy/dynamic.yml /dynamic.yml

# Default environment variables
ENV PORT=8080 \
    API_UPSTREAM=http://api:3000 \
    DOCS_UPSTREAM=http://docs:3000 \
    ADMIN_UPSTREAM=http://admin:80 \
    WEB_UPSTREAM=http://web:3000 \
    OTEL_COLLECTOR_UPSTREAM=otel-collector:4318 \
    OTEL_COLLECTOR_GRPC_UPSTREAM=otel-collector:4317

ENTRYPOINT ["traefik"]
CMD ["--configFile=/traefik.yml"]
