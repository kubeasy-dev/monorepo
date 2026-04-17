import { BullMQInstrumentation } from "@appsignal/opentelemetry-instrumentation-bullmq";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import {
  envDetector,
  processDetector,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";

const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    "service.name": "kubeasy-api",
    "service.version": process.env.npm_package_version ?? "0.0.0",
    "deployment.environment": process.env.NODE_ENV ?? "development",
  }),
  resourceDetectors: [envDetector, processDetector],
  textMapPropagator: new W3CTraceContextPropagator(),
  traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` }),
  ),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new RuntimeNodeInstrumentation(),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
      requireParentSpan: true, // Force les spans DB à être enfants d'une span existante (ex: HTTP)
    }),
    new IORedisInstrumentation({
      requireParentSpan: true,
    }),
    new BullMQInstrumentation(),
    new PinoInstrumentation({
      logKeys: {
        traceId: "trace_id",
        spanId: "span_id",
        traceFlags: "trace_flags",
      },
    }),
  ],
});

sdk.start();

export { sdk };
