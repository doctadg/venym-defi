import logger from '@/lib/logger';

export interface TimeoutOptions {
  timeoutMs: number;
  timeoutMessage?: string;
  abortController?: AbortController;
  onTimeout?: (timeoutMs: number) => void;
  context?: string;
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public timeoutMs: number,
    public context?: string
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(
  operation: (signal?: AbortSignal) => Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeoutMs, timeoutMessage, abortController, onTimeout, context } = options;
  
  const controller = abortController || new AbortController();
  const timeoutId = setTimeout(() => {
    if (onTimeout) {
      try {
        onTimeout(timeoutMs);
      } catch (error) {
        logger.warn({ error, context }, 'onTimeout callback failed');
      }
    }
    
    logger.warn({
      timeoutMs,
      context: context || 'timeout'
    }, 'Operation timed out');
    
    controller.abort();
  }, timeoutMs);

  try {
    const result = await operation(controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Check if this is a timeout/abort error
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      const message = timeoutMessage || `Operation timed out after ${timeoutMs}ms`;
      throw new TimeoutError(message, timeoutMs, context);
    }
    
    throw error;
  }
}

// Provider-specific timeout configurations
export const PROVIDER_TIMEOUTS = {
  LIFI: {
    // LiFi API timeouts
    QUOTE: 10000,     // 10 seconds for quotes
    SWAP: 30000,      // 30 seconds for swap preparation
    STATUS: 15000,    // 15 seconds for status checks
    HEALTH: 5000      // 5 seconds for health checks
  },
  SIDESHIFT: {
    // SideShift API timeouts
    QUOTE: 8000,      // 8 seconds for quotes
    SWAP: 25000,      // 25 seconds for shift creation
    STATUS: 10000,    // 10 seconds for status checks  
    HEALTH: 5000      // 5 seconds for health checks
  },
  PRICE_SERVICE: {
    // Price service timeouts
    FETCH: 5000,      // 5 seconds for price fetching
    CONVERT: 3000     // 3 seconds for conversion
  },
  DATABASE: {
    // Database operation timeouts
    QUERY: 10000,     // 10 seconds for queries
    TRANSACTION: 30000 // 30 seconds for transactions
  }
} as const;

// Enhanced fetch with timeout and abort support
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 10000, ...fetchOptions } = options;
  
  return withTimeout(
    async (signal) => {
      const controller = new AbortController();
      
      // Combine signals
      if (signal) {
        signal.addEventListener('abort', () => controller.abort());
      }
      
      return fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
    },
    {
      timeoutMs,
      timeoutMessage: `HTTP request to ${url} timed out after ${timeoutMs}ms`,
      context: `fetch:${url}`
    }
  );
}

// Provider-specific timeout wrappers
export class ProviderTimeoutManager {
  constructor(private providerName: string) {}

  async executeQuote<T>(operation: (signal?: AbortSignal) => Promise<T>): Promise<T> {
    const timeoutMs = this.getTimeoutForOperation('QUOTE');
    return withTimeout(operation, {
      timeoutMs,
      timeoutMessage: `${this.providerName} quote operation timed out`,
      context: `${this.providerName.toLowerCase()}:quote`
    });
  }

  async executeSwap<T>(operation: (signal?: AbortSignal) => Promise<T>): Promise<T> {
    const timeoutMs = this.getTimeoutForOperation('SWAP');
    return withTimeout(operation, {
      timeoutMs,
      timeoutMessage: `${this.providerName} swap operation timed out`,
      context: `${this.providerName.toLowerCase()}:swap`
    });
  }

  async executeStatus<T>(operation: (signal?: AbortSignal) => Promise<T>): Promise<T> {
    const timeoutMs = this.getTimeoutForOperation('STATUS');
    return withTimeout(operation, {
      timeoutMs,
      timeoutMessage: `${this.providerName} status check timed out`,
      context: `${this.providerName.toLowerCase()}:status`
    });
  }

  async executeHealth<T>(operation: (signal?: AbortSignal) => Promise<T>): Promise<T> {
    const timeoutMs = this.getTimeoutForOperation('HEALTH');
    return withTimeout(operation, {
      timeoutMs,
      timeoutMessage: `${this.providerName} health check timed out`,
      context: `${this.providerName.toLowerCase()}:health`
    });
  }

  private getTimeoutForOperation(operation: string): number {
    const providerTimeouts = PROVIDER_TIMEOUTS[this.providerName as keyof typeof PROVIDER_TIMEOUTS];
    
    if (!providerTimeouts) {
      logger.warn({ provider: this.providerName }, 'Unknown provider for timeout configuration');
      return 10000; // Default 10 seconds
    }

    const timeout = providerTimeouts[operation as keyof typeof providerTimeouts];
    return timeout || 10000; // Default 10 seconds
  }
}

// Convenience instances for each provider
export const lifiTimeouts = new ProviderTimeoutManager('LIFI');
export const sideshiftTimeouts = new ProviderTimeoutManager('SIDESHIFT');

// Utility for database operations with timeout
export async function withDatabaseTimeout<T>(
  operation: () => Promise<T>,
  operationType: 'QUERY' | 'TRANSACTION' = 'QUERY'
): Promise<T> {
  const timeoutMs = PROVIDER_TIMEOUTS.DATABASE[operationType];
  
  return withTimeout(
    async () => operation(),
    {
      timeoutMs,
      timeoutMessage: `Database ${operationType.toLowerCase()} timed out after ${timeoutMs}ms`,
      context: `database:${operationType.toLowerCase()}`
    }
  );
}

// Utility for price service operations with timeout
export async function withPriceTimeout<T>(
  operation: () => Promise<T>,
  operationType: 'FETCH' | 'CONVERT' = 'FETCH'
): Promise<T> {
  const timeoutMs = PROVIDER_TIMEOUTS.PRICE_SERVICE[operationType];
  
  return withTimeout(
    async () => operation(),
    {
      timeoutMs,
      timeoutMessage: `Price service ${operationType.toLowerCase()} timed out after ${timeoutMs}ms`,
      context: `price:${operationType.toLowerCase()}`
    }
  );
}

// Timeout configuration loader (can be extended to load from environment/config)
export function getProviderTimeout(
  provider: string, 
  operation: string,
  defaultTimeout: number = 10000
): number {
  try {
    const providerKey = provider.toUpperCase() as keyof typeof PROVIDER_TIMEOUTS;
    const providerTimeouts = PROVIDER_TIMEOUTS[providerKey];
    
    if (!providerTimeouts) {
      return defaultTimeout;
    }
    
    const operationKey = operation.toUpperCase() as keyof typeof providerTimeouts;
    return providerTimeouts[operationKey] || defaultTimeout;
  } catch (error) {
    logger.warn({ provider, operation, error }, 'Failed to get provider timeout');
    return defaultTimeout;
  }
}