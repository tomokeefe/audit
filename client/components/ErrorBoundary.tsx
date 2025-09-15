import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: Date.now().toString(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error to monitoring service (if available)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real app, this would send to a service like Sentry
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: "anonymous", // Replace with actual user ID if available
      };

      // Store in localStorage for now (in production, send to monitoring service)
      const existingErrors = JSON.parse(
        localStorage.getItem("app_errors") || "[]",
      );
      existingErrors.push(errorReport);

      // Keep only last 10 errors to prevent storage bloat
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem("app_errors", JSON.stringify(recentErrors));

      console.log("Error logged:", errorReport);
    } catch (loggingError) {
      console.error("Failed to log error:", loggingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    });
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;

    const errorDetails = {
      message: error?.message || "Unknown error",
      stack: error?.stack || "No stack trace",
      componentStack: errorInfo?.componentStack || "No component stack",
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    const subject = encodeURIComponent("Brand Audit App Error Report");
    const body = encodeURIComponent(`Error Report:

Message: ${errorDetails.message}
URL: ${errorDetails.url}
Timestamp: ${errorDetails.timestamp}

Stack Trace:
${errorDetails.stack}

Component Stack:
${errorDetails.componentStack}

Additional Info:
- Browser: ${navigator.userAgent}
- Error ID: ${this.state.errorId}

Please include any additional context about what you were doing when this error occurred.`);

    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription>
                An unexpected error occurred while loading this page. We've been
                notified and are working to fix it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Details (only show in development) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Error Details (Development Only)
                  </h4>
                  <pre className="text-xs text-red-700 whitespace-pre-wrap break-all">
                    {this.state.error.message}
                  </pre>
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap break-all">
                      {this.state.error.stack}
                    </pre>
                  </details>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => (window.location.href = "/")}
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              <Button
                onClick={this.handleReportError}
                variant="ghost"
                size="sm"
                className="w-full flex items-center justify-center gap-2 text-gray-600"
              >
                <Bug className="h-4 w-4" />
                Report This Error
              </Button>

              {/* Error ID for support */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Error ID: {this.state.errorId}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void,
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Error reporting utility
export const reportError = (error: Error, context?: Record<string, any>) => {
  const errorReport = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    context: context || {},
  };

  try {
    // Store in localStorage for now (in production, send to monitoring service)
    const existingErrors = JSON.parse(
      localStorage.getItem("app_errors") || "[]",
    );
    existingErrors.push(errorReport);

    // Keep only last 10 errors to prevent storage bloat
    const recentErrors = existingErrors.slice(-10);
    localStorage.setItem("app_errors", JSON.stringify(recentErrors));

    console.error("Error reported:", errorReport);
  } catch (loggingError) {
    console.error("Failed to report error:", loggingError);
  }
};

// Error monitoring hook
export const useErrorMonitoring = () => {
  const [errors, setErrors] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadErrors = () => {
      try {
        const storedErrors = JSON.parse(
          localStorage.getItem("app_errors") || "[]",
        );
        setErrors(storedErrors);
      } catch (error) {
        console.error("Failed to load error history:", error);
      }
    };

    loadErrors();

    // Set up global error handlers
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = new Error(
        event.reason?.message || "Unhandled Promise Rejection",
      );
      reportError(error, { type: "unhandledRejection", reason: event.reason });
    };

    const handleError = (event: ErrorEvent) => {
      const error = new Error(event.message);
      reportError(error, {
        type: "javascriptError",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  const clearErrors = () => {
    localStorage.removeItem("app_errors");
    setErrors([]);
  };

  return { errors, clearErrors };
};
