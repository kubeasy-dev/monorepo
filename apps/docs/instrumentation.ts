export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { resourceFromAttributes } = await import("@opentelemetry/resources");
    const { HttpInstrumentation } = await import(
      "@opentelemetry/instrumentation-http"
    );
    const { RuntimeNodeInstrumentation } = await import(
      "@opentelemetry/instrumentation-runtime-node"
    );

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        "service.name": "kubeasy-docs",
        "service.version": "0.0.0",
        "deployment.environment": process.env.NODE_ENV ?? "development",
      }),
      traceExporter: new OTLPTraceExporter({
        url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://otel-collector:4318"}/v1/traces`,
      }),
      instrumentations: [
        new HttpInstrumentation(),
        new RuntimeNodeInstrumentation(),
      ],
    });

    sdk.start();
  }
}
