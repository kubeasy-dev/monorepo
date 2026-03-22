import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import pino from "pino";
import PinoPretty from "pino-pretty";

const isDev = process.env.NODE_ENV !== "production";

/** Only scalar values — matches the existing logger API contract */
export type LogAttributes = Record<string, string | number | boolean>;

const level = process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");

// In dev, use pino-pretty as a sync stream (not a worker transport) so that
// the main thread is not blocked and OTel can emit in the same context.
const pinoInstance = isDev
  ? pino({ level }, PinoPretty({ colorize: true, sync: true }))
  : pino({ level });

const otelLogger = logs.getLogger("kubeasy");

const SEVERITY: Record<string, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

function emit(
  severityText: "debug" | "info" | "warn" | "error",
  message: string,
  attributes?: LogAttributes,
) {
  try {
    otelLogger.emit({
      severityNumber: SEVERITY[severityText],
      severityText: severityText.toUpperCase(),
      body: message,
      attributes,
    });
  } catch {
    // OTel not initialised (e.g. tests) — silently ignore
  }
}

export const logger = {
  debug: (message: string, attributes?: LogAttributes) => {
    attributes
      ? pinoInstance.debug(attributes, message)
      : pinoInstance.debug(message);
    emit("debug", message, attributes);
  },
  info: (message: string, attributes?: LogAttributes) => {
    attributes
      ? pinoInstance.info(attributes, message)
      : pinoInstance.info(message);
    emit("info", message, attributes);
  },
  warn: (message: string, attributes?: LogAttributes) => {
    attributes
      ? pinoInstance.warn(attributes, message)
      : pinoInstance.warn(message);
    emit("warn", message, attributes);
  },
  error: (message: string, attributes?: LogAttributes) => {
    attributes
      ? pinoInstance.error(attributes, message)
      : pinoInstance.error(message);
    emit("error", message, attributes);
  },
};
