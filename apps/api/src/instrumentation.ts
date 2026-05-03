import { BullMQInstrumentation } from "@appsignal/opentelemetry-instrumentation-bullmq";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import {
  envDetector,
  processDetector,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "kubeasy-api",
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.0.0",
    "deployment.environment.name": process.env.NODE_ENV ?? "development",
  }),
  resourceDetectors: [envDetector, processDetector],
  textMapPropagator: new W3CTraceContextPropagator(),
  traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
  logRecordProcessors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` }),
    ),
  ],
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
    }),
  ],
  instrumentations: [
    new RuntimeNodeInstrumentation(),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
      requireParentSpan: true,
    }),
    new BullMQInstrumentation(),
  ],
});

sdk.start();

export { sdk };
