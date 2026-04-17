import pino, { type Logger } from "pino";
import PinoPretty from "pino-pretty";

const isDev = process.env.NODE_ENV !== "production";

/** Only scalar values — matches the existing logger API contract */
export type LogAttributes = Record<string, string | number | boolean>;

const level = process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");

let pinoInstance: Logger | null = null;

function getPino(): Logger {
  if (pinoInstance) return pinoInstance;

  if (isDev) {
    pinoInstance = pino({ level }, PinoPretty({ colorize: true, sync: true }));
  } else {
    // Standard JSON logging in production
    // The OTel instrumentation will automatically intercept and correlate logs
    // if configured with recordLog: true or similar options
    pinoInstance = pino({ level });
  }

  return pinoInstance;
}

export const logger = {
  debug: (message: string, attributes?: LogAttributes) => {
    const p = getPino();
    if (attributes) {
      p.debug(attributes, message);
    } else {
      p.debug(message);
    }
  },
  info: (message: string, attributes?: LogAttributes) => {
    const p = getPino();
    if (attributes) {
      p.info(attributes, message);
    } else {
      p.info(message);
    }
  },
  warn: (message: string, attributes?: LogAttributes) => {
    const p = getPino();
    if (attributes) {
      p.warn(attributes, message);
    } else {
      p.warn(message);
    }
  },
  error: (message: string, attributes?: LogAttributes) => {
    const p = getPino();
    if (attributes) {
      p.error(attributes, message);
    } else {
      p.error(message);
    }
  },
};
