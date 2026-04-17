FROM otel/opentelemetry-collector-contrib:0.114.0

ARG CONFIG_PATH=config.yaml

COPY ${CONFIG_PATH} /etc/otelcol/config.yaml

EXPOSE 4317
EXPOSE 4318
EXPOSE 13133
