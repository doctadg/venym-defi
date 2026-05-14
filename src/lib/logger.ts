// Simple console logger for swap services
const logger = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  debug: (...args: unknown[]) => {
    if (process.env.LOG_LEVEL === 'debug') console.log('[DEBUG]', ...args);
  },
};
export default logger;
