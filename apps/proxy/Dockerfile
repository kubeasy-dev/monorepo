FROM caddy:2-alpine@sha256:834468128c7696cec0ceea6172f7d692daf645ae51983ca76e39da54a97c570d

COPY apps/proxy/Caddyfile /etc/caddy/Caddyfile

# Default environment variables
ENV PORT=8081 \
    API_UPSTREAM=api.railway.internal:3000 \
    DOCS_UPSTREAM=docs.railway.internal:3000 \
    ADMIN_UPSTREAM=admin.railway.internal:80 \
    WEB_UPSTREAM=web.railway.internal:3000 \
    OTEL_COLLECTOR_UPSTREAM=otel-collector.railway.internal:4318

EXPOSE 8080 8081
