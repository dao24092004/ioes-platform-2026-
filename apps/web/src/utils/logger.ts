type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_PREFIX = '[IOES]';
const isDevelopment = import.meta.env.DEV;

function formatMessage(level: LogLevel, context: string, message: string): string {
  return `${LOG_PREFIX} [${level.toUpperCase()}] [${context}] ${message}`;
}

function shouldLog(level: LogLevel): boolean {
  if (isDevelopment) return true;
  return level !== 'debug';
}

export const logger = {
  debug(context: string, message: string, data?: unknown): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', context, message), data ?? '');
    }
  },

  info(context: string, message: string, data?: unknown): void {
    if (shouldLog('info')) {
      console.info(formatMessage('info', context, message), data ?? '');
    }
  },

  warn(context: string, message: string, data?: unknown): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', context, message), data ?? '');
    }
  },

  error(context: string, message: string, error?: unknown): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', context, message), error ?? '');
    }
  },
};
