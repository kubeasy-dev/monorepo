FROM otel/opentelemetry-collector-contrib:0.150.1@sha256:a516c26968aa1feb5e5fc0562e3338ea13755cb4f373603226bcc4e276374ad0

ARG CONFIG_FILE=config.yaml

COPY ${CONFIG_FILE} /etc/otelcol/config.yaml

CMD ["--config=/etc/otelcol/config.yaml"]

EXPOSE 4317
EXPOSE 4318
EXPOSE 13133
