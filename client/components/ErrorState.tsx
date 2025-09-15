import React from 'react';
import { AlertTriangle, RefreshCw, Home, Wifi, WifiOff, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  onGoHome?: () => void;
  showHomeButton?: boolean;
  showRetryButton?: boolean;
  showError?: boolean;
  type?: 'network' | 'server' | 'validation' | 'generic';
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  error,
  onRetry,
  onGoHome,
  showHomeButton = true,
  showRetryButton = true,
  showError = process.env.NODE_ENV === 'development',
  type = 'generic',
  className = '',
}) => {
  // Get appropriate icon and colors based on error type
  const getErrorTypeConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: WifiOff,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-100',
          defaultTitle: 'Connection Error',
          defaultMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
        };
      case 'server':
        return {
          icon: Server,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          defaultTitle: 'Server Error',
          defaultMessage: 'The server is currently experiencing issues. Please try again in a few moments.',
        };
      case 'validation':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          defaultTitle: 'Invalid Data',
          defaultMessage: 'The provided data is invalid. Please check your input and try again.',
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          defaultTitle: 'Something went wrong',
          defaultMessage: 'An unexpected error occurred. Please try again.',
        };
    }
  };

  const config = getErrorTypeConfig();
  const Icon = config.icon;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className={`flex items-center justify-center p-6 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>
          <CardTitle className="text-xl text-gray-900">
            {title || config.defaultTitle}
          </CardTitle>
          <CardDescription>
            {message || config.defaultMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Details (only show if requested) */}
          {showError && errorMessage && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Error Details
              </h4>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                {errorMessage}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {showRetryButton && (
              <Button
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            {showHomeButton && (
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            )}
          </div>

          {/* Additional help text based on error type */}
          {type === 'network' && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Make sure you're connected to the internet and try again.
              </p>
            </div>
          )}
          
          {type === 'server' && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Our team has been notified and is working to resolve this issue.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorState;

// Convenience components for specific error types
export const NetworkError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState {...props} type="network" />
);

export const ServerError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState {...props} type="server" />
);

export const ValidationError: React.FC<Omit<ErrorStateProps, 'type'>> = (props) => (
  <ErrorState {...props} type="validation" />
);

// Hook for handling common error states
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleError = React.useCallback((error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error);
    setError(errorObj);
    
    // Log error for monitoring
    console.error('Error handled:', errorObj);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retry = React.useCallback(async (retryFn?: () => Promise<void> | void) => {
    setIsRetrying(true);
    setError(null);
    
    try {
      if (retryFn) {
        await retryFn();
      }
    } catch (error) {
      handleError(error as Error);
    } finally {
      setIsRetrying(false);
    }
  }, [handleError]);

  const getErrorType = React.useCallback((error: Error | null): ErrorStateProps['type'] => {
    if (!error) return 'generic';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    
    if (message.includes('server') || message.includes('500') || message.includes('503')) {
      return 'server';
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('400')) {
      return 'validation';
    }
    
    return 'generic';
  }, []);

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry,
    getErrorType: () => getErrorType(error),
  };
};
