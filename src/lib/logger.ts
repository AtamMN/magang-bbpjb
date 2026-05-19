type LogLevel = "debug" | "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";
const forceVerboseLogs = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === "true";

function shouldLog(level: LogLevel): boolean {
  if (forceVerboseLogs) {
    return true;
  }

  if (!isProduction) {
    return true;
  }

  return level === "error";
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog("debug")) {
      console.debug(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog("info")) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog("warn")) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (shouldLog("error")) {
      console.error(...args);
    }
  },
};

export default logger;