/**
 * Structured Logging Utility
 *
 * Outputs JSON-formatted logs that integrate with Vercel's log drain
 * and can be searched/filtered in production monitoring tools.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  orgId?: string;
  userId?: string;
  action?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatError(err: unknown): LogEntry['error'] {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };
  }
  return {
    name: 'UnknownError',
    message: String(err),
  };
}

function emit(entry: LogEntry): void {
  const output = JSON.stringify(entry);

  switch (entry.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(output);
      }
      break;
    default:
      console.log(output);
  }
}

type LogOptions = Omit<LogEntry, 'level' | 'message' | 'timestamp'>;

export const logger = {
  debug(message: string, options?: LogOptions): void {
    emit({ level: 'debug', message, timestamp: new Date().toISOString(), ...options });
  },

  info(message: string, options?: LogOptions): void {
    emit({ level: 'info', message, timestamp: new Date().toISOString(), ...options });
  },

  warn(message: string, options?: LogOptions): void {
    emit({ level: 'warn', message, timestamp: new Date().toISOString(), ...options });
  },

  error(message: string, err?: unknown, options?: LogOptions): void {
    emit({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: err ? formatError(err) : undefined,
      ...options,
    });
  },
};
