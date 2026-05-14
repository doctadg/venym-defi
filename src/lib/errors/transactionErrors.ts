/**
 * Transaction error types and utilities for the venym-defi swap integration.
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface TransactionError {
  code: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  actionable: boolean;
  suggestedAction?: string;
  txHash?: string;
  details?: Record<string, unknown>;
}

/**
 * Maps common blockchain/transaction error patterns to user-friendly TransactionError objects.
 */
export function parseTransactionError(error: unknown): TransactionError {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // User rejected
    if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('user cancelled')) {
      return {
        code: 'USER_REJECTED',
        message: error.message,
        userMessage: 'Transaction was rejected by the user.',
        severity: 'info',
        actionable: false,
      };
    }

    // Insufficient funds
    if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) {
      return {
        code: 'INSUFFICIENT_FUNDS',
        message: error.message,
        userMessage: 'Insufficient funds to complete this transaction.',
        severity: 'error',
        actionable: true,
        suggestedAction: 'Add more funds to your wallet or reduce the swap amount.',
      };
    }

    // Slippage / price impact
    if (msg.includes('slippage') || msg.includes('price impact too high')) {
      return {
        code: 'SLIPPAGE_TOO_HIGH',
        message: error.message,
        userMessage: 'Price impact is too high. Try increasing slippage tolerance or reducing the amount.',
        severity: 'warning',
        actionable: true,
        suggestedAction: 'Increase slippage tolerance in settings or try a smaller amount.',
      };
    }

    // Timeout
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return {
        code: 'TIMEOUT',
        message: error.message,
        userMessage: 'The transaction timed out. The network may be congested.',
        severity: 'warning',
        actionable: true,
        suggestedAction: 'Try again later or increase gas price.',
      };
    }

    // Rate limited
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return {
        code: 'RATE_LIMITED',
        message: error.message,
        userMessage: 'Too many requests. Please wait and try again.',
        severity: 'warning',
        actionable: true,
        suggestedAction: 'Wait a moment and try again.',
      };
    }

    // Network / RPC errors
    if (msg.includes('network') || msg.includes('rpc') || msg.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage: 'A network error occurred. Please check your connection.',
        severity: 'error',
        actionable: true,
        suggestedAction: 'Check your internet connection and try again.',
      };
    }

    // Generic
    return {
      code: 'UNKNOWN',
      message: error.message,
      userMessage: error.message || 'An unexpected error occurred.',
      severity: 'error',
      actionable: true,
      suggestedAction: 'Please try again or contact support if the issue persists.',
    };
  }

  if (typeof error === 'string') {
    return {
      code: 'UNKNOWN',
      message: error,
      userMessage: error,
      severity: 'error',
      actionable: true,
      suggestedAction: 'Please try again.',
    };
  }

  return {
    code: 'UNKNOWN',
    message: String(error),
    userMessage: 'An unknown error occurred.',
    severity: 'error',
    actionable: true,
    suggestedAction: 'Please try again.',
  };
}

/**
 * Returns Tailwind CSS color classes for a given error severity.
 */
export function getErrorSeverityColor(severity: ErrorSeverity): string {
  switch (severity) {
    case 'info':
      return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
    case 'error':
      return 'bg-red-500/10 border-red-500/30 text-red-300';
    case 'critical':
      return 'bg-red-600/10 border-red-600/30 text-red-200';
    default:
      return 'bg-red-500/10 border-red-500/30 text-red-300';
  }
}
