FROM caddy:2-alpine

COPY apps/proxy/Caddyfile /etc/caddy/Caddyfile

# Default environment variables
ENV PORT=8081 \
    API_UPSTREAM=api.railway.internal:3000 \
    DOCS_UPSTREAM=docs.railway.internal:3000 \
    ADMIN_UPSTREAM=admin.railway.internal:80 \
    WEB_UPSTREAM=web.railway.internal:3000 \
    OTEL_COLLECTOR_UPSTREAM=otel-collector.railway.internal:4318

EXPOSE 8080 8081
