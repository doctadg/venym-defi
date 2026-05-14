import logger from '@/lib/logger';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterFactor?: number;
  retryCondition?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, nextDelay: number) => void;
  context?: string;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'context'>> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryCondition: (error: any) => {
    // Retry on network errors, timeouts, and 5xx responses
    if (error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
      return true;
    }
    
    // Retry on HTTP 5xx errors and some 4xx errors
    if (error?.response?.status >= 500) {
      return true;
    }
    
    // Retry on specific 4xx errors that might be temporary
    if (error?.response?.status === 429 || error?.response?.status === 408) {
      return true;
    }
    
    // Don't retry on client errors (4xx) except the ones above
    if (error?.response?.status >= 400 && error?.response?.status < 500) {
      return false;
    }
    
    return true; // Retry by default for unknown errors
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      const totalTime = Date.now() - startTime;
      
      if (attempt > 1) {
        logger.info({
          context: config.context || 'retry',
          attempt,
          totalTime,
          success: true
        }, 'Operation succeeded after retry');
      }
      
      return {
        success: true,
        data: result,
        attempts: attempt,
        totalTime
      };
      
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === config.maxAttempts;
      
      // Check if we should retry this error
      if (isLastAttempt || !config.retryCondition(error, attempt)) {
        const totalTime = Date.now() - startTime;
        
        logger.error({
          context: config.context || 'retry',
          error: error instanceof Error ? error.message : error,
          attempt,
          maxAttempts: config.maxAttempts,
          totalTime,
          willRetry: false
        }, 'Operation failed - no more retries');
        
        return {
          success: false,
          error,
          attempts: attempt,
          totalTime
        };
      }
      
      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      
      // Add jitter to prevent thundering herd
      const jitter = baseDelay * config.jitterFactor * (Math.random() * 2 - 1);
      const delay = Math.max(0, baseDelay + jitter);
      
      logger.warn({
        context: config.context || 'retry',
        error: error instanceof Error ? error.message : error,
        attempt,
        maxAttempts: config.maxAttempts,
        nextDelayMs: Math.round(delay),
        willRetry: true
      }, 'Operation failed - retrying');
      
      // Call onRetry callback if provided
      if (config.onRetry) {
        try {
          config.onRetry(error, attempt, delay);
        } catch (callbackError) {
          logger.warn({ callbackError }, 'onRetry callback failed');
        }
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  const totalTime = Date.now() - startTime;
  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
    totalTime
  };
}

// Specialized retry configurations for different types of operations
export const RETRY_CONFIGS = {
  // For critical operations like swap execution
  CRITICAL: {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.2
  },
  
  // For quote fetching operations
  QUOTE: {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.1
  },
  
  // For status checking operations
  STATUS: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.15
  },
  
  // For price fetching operations
  PRICE: {
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterFactor: 0.1
  }
} as const;

// Utility function for wrapping async operations with retry
export function retryWrapper<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  return async (...args: T): Promise<R> => {
    const result = await withRetry(() => fn(...args), options);
    
    if (!result.success) {
      throw result.error;
    }
    
    return result.data!;
  };
}

// Convenience functions for common retry patterns
export const withCriticalRetry = <T>(operation: () => Promise<T>, context?: string) =>
  withRetry(operation, { ...RETRY_CONFIGS.CRITICAL, context });

export const withQuoteRetry = <T>(operation: () => Promise<T>, context?: string) =>
  withRetry(operation, { ...RETRY_CONFIGS.QUOTE, context });

export const withStatusRetry = <T>(operation: () => Promise<T>, context?: string) =>
  withRetry(operation, { ...RETRY_CONFIGS.STATUS, context });

export const withPriceRetry = <T>(operation: () => Promise<T>, context?: string) =>
  withRetry(operation, { ...RETRY_CONFIGS.PRICE, context });