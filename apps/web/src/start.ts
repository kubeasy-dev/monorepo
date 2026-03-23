import { SpanStatusCode, trace } from "@opentelemetry/api";
import { createMiddleware, createStart } from "@tanstack/react-start";

const tracer = trace.getTracer("kubeasy-web");

const tracingMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next, request, pathname }) => {
    return tracer.startActiveSpan(
      `${request.method} ${pathname}`,
      async (span) => {
        span.setAttributes({
          "http.request.method": request.method,
          "url.full": request.url,
          "http.route": pathname,
        });

        try {
          const result = await next();
          span.setAttribute(
            "http.response.status_code",
            result.response?.status ?? 200,
          );
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [tracingMiddleware],
}));
