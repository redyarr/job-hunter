type Level = "debug" | "info" | "warn" | "error";

function ts() {
  return new Date().toISOString();
}

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = `[${ts()}] [${level.toUpperCase()}] ${message}`;
  const payload = meta ? JSON.stringify(meta) : "";
  if (level === "error") {
    console.error(line, payload);
  } else if (level === "warn") {
    console.warn(line, payload);
  } else {
    console.log(line, payload);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};
