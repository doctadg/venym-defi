import React from 'react';
import { AlertCircle, AlertTriangle, Info, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from './button';
import { TransactionError, getErrorSeverityColor } from '@/lib/errors/transactionErrors';

interface ErrorDisplayProps {
  error: TransactionError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showTechnicalDetails?: boolean;
  className?: string;
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  showTechnicalDetails = false,
  className = '' 
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  
  const getIcon = () => {
    switch (error.severity) {
      case 'error':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 flex-shrink-0" />;
      default:
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
    }
  };

  const severityColors = getErrorSeverityColor(error.severity);

  return (
    <div className={`p-4 border rounded-lg ${severityColors} ${className}`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          {/* Main error message */}
          <div className="font-medium text-sm mb-2">
            {error.userMessage}
          </div>

          {/* Suggested action */}
          {error.actionable && error.suggestedAction && (
            <div className="text-xs opacity-90 mb-3">
              <strong>Suggestion:</strong> {error.suggestedAction}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {error.actionable && onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="h-8 text-xs bg-transparent hover:bg-white/10 border-current"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
            )}

            {showTechnicalDetails && (
              <Button
                onClick={() => setShowDetails(!showDetails)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs hover:bg-white/10"
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            )}

            {onDismiss && (
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="h-8 text-xs hover:bg-white/10 ml-auto"
              >
                Dismiss
              </Button>
            )}
          </div>

          {/* Technical details (collapsible) */}
          {showTechnicalDetails && showDetails && (
            <div className="mt-3 pt-3 border-t border-current/20">
              <div className="text-xs space-y-2">
                <div>
                  <span className="font-medium">Error Code:</span> {error.code}
                </div>
                <div>
                  <span className="font-medium">Technical Message:</span>
                  <div className="mt-1 p-2 bg-black/20 rounded text-xs font-mono break-all">
                    {error.message}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TransactionErrorDisplayProps {
  error: TransactionError | Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showTechnicalDetails?: boolean;
  className?: string;
}

export function TransactionErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  showTechnicalDetails = false,
  className = '' 
}: TransactionErrorDisplayProps) {
  if (!error) return null;

  // Handle different error types
  let transactionError: TransactionError;

  if (typeof error === 'string') {
    transactionError = {
      code: 'UNKNOWN',
      message: error,
      userMessage: error,
      severity: 'error',
      actionable: true,
      suggestedAction: 'Please try again or contact support if the issue persists'
    };
  } else if ('code' in error && 'userMessage' in error) {
    // Already a TransactionError
    transactionError = error as TransactionError;
  } else {
    // Regular Error object
    const errorMessage = error.message || 'An unknown error occurred';
    transactionError = {
      code: 'UNKNOWN',
      message: errorMessage,
      userMessage: errorMessage,
      severity: 'error',
      actionable: true,
      suggestedAction: 'Please try again or contact support if the issue persists'
    };
  }

  return (
    <ErrorDisplay
      error={transactionError}
      onRetry={onRetry}
      onDismiss={onDismiss}
      showTechnicalDetails={showTechnicalDetails}
      className={className}
    />
  );
}

// Quick error display for insufficient funds specifically
export function InsufficientFundsError({ 
  onRetry, 
  onDismiss, 
  className = '' 
}: { 
  onRetry?: () => void; 
  onDismiss?: () => void; 
  className?: string; 
}) {
  const error: TransactionError = {
    code: 'INSUFFICIENT_FUNDS',
    message: 'Insufficient funds for transaction',
    userMessage: 'You don\'t have enough funds to complete this transaction. Please check your wallet balance and ensure you have enough tokens to cover the swap amount plus network fees.',
    severity: 'error',
    actionable: true,
    suggestedAction: 'Add more funds to your wallet or reduce the swap amount'
  };

  return (
    <ErrorDisplay
      error={error}
      onRetry={onRetry}
      onDismiss={onDismiss}
      className={className}
    />
  );
}
