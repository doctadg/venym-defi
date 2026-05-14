import logger from '@/lib/logger';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast, not calling service
  HALF_OPEN = 'HALF_OPEN' // Testing if service is recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Number of successes needed to close from half-open
  timeout: number;               // Time to wait before moving to half-open
  monitoringPeriod: number;      // Time window for failure tracking
  name: string;                  // Circuit breaker name for logging
  shouldTrackFailure?: (error: any) => boolean; // Custom failure detection
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  openedAt: number | null;
  halfOpenedAt: number | null;
}

export class CircuitBreakerError extends Error {
  constructor(
    public circuitBreakerName: string,
    public state: CircuitBreakerState,
    public metrics: CircuitBreakerMetrics
  ) {
    super(`Circuit breaker '${circuitBreakerName}' is ${state}`);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private openedAt: number | null = null;
  private halfOpenedAt: number | null = null;
  private nextAttempt = 0;

  constructor(private options: CircuitBreakerOptions) {
    if (options.failureThreshold <= 0) {
      throw new Error('failureThreshold must be greater than 0');
    }
    if (options.successThreshold <= 0) {
      throw new Error('successThreshold must be greater than 0');
    }
    if (options.timeout <= 0) {
      throw new Error('timeout must be greater than 0');
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const now = Date.now();
    this.totalRequests++;

    // Clean up old failures outside the monitoring period
    if (this.lastFailureTime && now - this.lastFailureTime > this.options.monitoringPeriod) {
      this.failureCount = 0;
    }

    // State machine logic
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return this.callService(operation, now);

      case CircuitBreakerState.OPEN:
        if (now >= this.nextAttempt) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.halfOpenedAt = now;
          this.successCount = 0;
          
          logger.info({
            circuitBreaker: this.options.name,
            state: this.state,
            failureCount: this.failureCount
          }, 'Circuit breaker moving to HALF_OPEN state');
          
          return this.callService(operation, now);
        } else {
          const waitTime = Math.round((this.nextAttempt - now) / 1000);
          logger.debug({
            circuitBreaker: this.options.name,
            state: this.state,
            waitTimeSeconds: waitTime
          }, 'Circuit breaker is OPEN, failing fast');
          
          throw new CircuitBreakerError(this.options.name, this.state, this.getMetrics());
        }

      case CircuitBreakerState.HALF_OPEN:
        return this.callService(operation, now);

      default:
        throw new Error(`Invalid circuit breaker state: ${this.state}`);
    }
  }

  private async callService<T>(operation: () => Promise<T>, now: number): Promise<T> {
    try {
      const result = await operation();
      this.onSuccess(now);
      return result;
    } catch (error) {
      this.onFailure(error, now);
      throw error;
    }
  }

  private onSuccess(now: number): void {
    this.lastSuccessTime = now;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.openedAt = null;
        this.halfOpenedAt = null;
        
        logger.info({
          circuitBreaker: this.options.name,
          state: this.state,
          successCount: this.successCount
        }, 'Circuit breaker closed after successful recovery');
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on successful calls in closed state
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  private onFailure(error: any, now: number): void {
    this.lastFailureTime = now;

    // Check if this error should be tracked as a failure
    const shouldTrack = this.options.shouldTrackFailure ? 
      this.options.shouldTrackFailure(error) : 
      true; // Track all errors by default

    if (!shouldTrack) {
      return;
    }

    this.failureCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit
      this.state = CircuitBreakerState.OPEN;
      this.openedAt = now;
      this.halfOpenedAt = null;
      this.nextAttempt = now + this.options.timeout;
      
      logger.warn({
        circuitBreaker: this.options.name,
        state: this.state,
        error: error?.message || error,
        failureCount: this.failureCount,
        nextAttemptIn: Math.round(this.options.timeout / 1000)
      }, 'Circuit breaker opened from HALF_OPEN due to failure');
      
    } else if (this.state === CircuitBreakerState.CLOSED && this.failureCount >= this.options.failureThreshold) {
      // Too many failures in closed state
      this.state = CircuitBreakerState.OPEN;
      this.openedAt = now;
      this.nextAttempt = now + this.options.timeout;
      
      logger.warn({
        circuitBreaker: this.options.name,
        state: this.state,
        error: error?.message || error,
        failureCount: this.failureCount,
        threshold: this.options.failureThreshold,
        nextAttemptIn: Math.round(this.options.timeout / 1000)
      }, 'Circuit breaker opened due to failure threshold exceeded');
    }
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openedAt: this.openedAt,
      halfOpenedAt: this.halfOpenedAt
    };
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  isClosed(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HALF_OPEN;
  }

  // Manually reset the circuit breaker
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.openedAt = null;
    this.halfOpenedAt = null;
    this.nextAttempt = 0;
    
    logger.info({
      circuitBreaker: this.options.name,
      state: this.state
    }, 'Circuit breaker manually reset');
  }

  // Manually open the circuit breaker
  forceOpen(): void {
    const now = Date.now();
    this.state = CircuitBreakerState.OPEN;
    this.openedAt = now;
    this.halfOpenedAt = null;
    this.nextAttempt = now + this.options.timeout;
    
    logger.warn({
      circuitBreaker: this.options.name,
      state: this.state
    }, 'Circuit breaker manually forced open');
  }
}

// Default configurations for different types of services
export const CIRCUIT_BREAKER_CONFIGS = {
  // For critical external providers (LiFi, SideShift)
  PROVIDER: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
    shouldTrackFailure: (error: any) => {
      // Don't track client errors (4xx) as failures
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return true;
    }
  },
  
  // For price services
  PRICE_SERVICE: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 15000, // 15 seconds
    monitoringPeriod: 60000, // 1 minute
  },
  
  // For internal services
  INTERNAL_SERVICE: {
    failureThreshold: 10,
    successThreshold: 5,
    timeout: 10000, // 10 seconds
    monitoringPeriod: 120000, // 2 minutes
  }
} as const;

// Global circuit breaker registry
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options: CircuitBreakerOptions): CircuitBreaker {
  let breaker = circuitBreakers.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker({ ...options, name });
    circuitBreakers.set(name, breaker);
  }
  return breaker;
}

// Convenience functions
export function withCircuitBreaker<T>(
  name: string, 
  operation: () => Promise<T>, 
  options: Omit<CircuitBreakerOptions, 'name'>
): Promise<T> {
  const breaker = getCircuitBreaker(name, { ...options, name });
  return breaker.execute(operation);
}

export function getCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
  const metrics: Record<string, CircuitBreakerMetrics> = {};
  for (const [name, breaker] of circuitBreakers.entries()) {
    metrics[name] = breaker.getMetrics();
  }
  return metrics;
}

export function resetAllCircuitBreakers(): void {
  for (const breaker of circuitBreakers.values()) {
    breaker.reset();
  }
  logger.info('All circuit breakers reset');
}