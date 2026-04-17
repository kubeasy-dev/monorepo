import { ZoneContextManager } from "@opentelemetry/context-zone";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    "service.name": "kubeasy-admin-client",
    "service.version": "0.0.0",
  }),
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: "/instrumentation/v1/traces",
      }),
    ),
  ],
});

provider.register({
  contextManager: new ZoneContextManager(),
  propagator: new W3CTraceContextPropagator(),
});

registerInstrumentations({
  instrumentations: [
    new XMLHttpRequestInstrumentation(),
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /localhost:3001/,
        /localhost:3000/,
        /kubeasy\.dev/,
        window.location.origin,
      ],
    }),
  ],
});
