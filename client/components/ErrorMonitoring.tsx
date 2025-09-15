import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useErrorMonitoring } from '@/components/ErrorBoundary';
import { 
  AlertTriangle, 
  Trash2, 
  Download, 
  RefreshCw, 
  Bug,
  Clock,
  Globe,
  User,
  Monitor
} from 'lucide-react';

const ErrorMonitoring: React.FC = () => {
  const { errors, clearErrors } = useErrorMonitoring();

  const exportErrors = () => {
    const errorData = {
      exportDate: new Date().toISOString(),
      errorCount: errors.length,
      errors: errors,
    };

    const blob = new Blob([JSON.stringify(errorData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getErrorTypeIcon = (error: any) => {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return <Globe className="h-4 w-4 text-orange-500" />;
    }
    if (message.includes('component') || error.componentStack) {
      return <Monitor className="h-4 w-4 text-blue-500" />;
    }
    return <Bug className="h-4 w-4 text-red-500" />;
  };

  const getErrorTypeBadge = (error: any) => {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return <Badge variant="outline" className="text-orange-600 border-orange-300">Network</Badge>;
    }
    if (message.includes('component') || error.componentStack) {
      return <Badge variant="outline" className="text-blue-600 border-blue-300">Component</Badge>;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Validation</Badge>;
    }
    return <Badge variant="outline" className="text-red-600 border-red-300">Runtime</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Error Monitoring
              <Badge variant="secondary">{errors.length}</Badge>
            </CardTitle>
            <CardDescription>
              Development error tracking and debugging dashboard
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportErrors}
              variant="outline"
              size="sm"
              disabled={errors.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={clearErrors}
              variant="outline"
              size="sm"
              disabled={errors.length === 0}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Errors Recorded
            </h3>
            <p className="text-gray-600">
              Great! No errors have been captured recently.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {errors.map((error, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getErrorTypeIcon(error)}
                    <h4 className="font-medium text-gray-900 text-sm">
                      {error.message || 'Unknown Error'}
                    </h4>
                  </div>
                  {getErrorTypeBadge(error)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(error.timestamp)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {error.url || 'Unknown URL'}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {error.userId || 'Anonymous'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" />
                    {error.context?.type || 'Unknown Type'}
                  </div>
                </div>

                {error.stack && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                      {error.stack}
                    </pre>
                  </details>
                )}

                {error.componentStack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                      {error.componentStack}
                    </pre>
                  </details>
                )}

                {error.context && Object.keys(error.context).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                      Additional Context
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorMonitoring;

// Quick stats component for header or dashboard
export const ErrorStats: React.FC = () => {
  const { errors } = useErrorMonitoring();
  
  if (process.env.NODE_ENV !== 'development' || errors.length === 0) {
    return null;
  }

  const recentErrors = errors.filter(error => {
    const errorTime = new Date(error.timestamp).getTime();
    const hourAgo = Date.now() - (60 * 60 * 1000);
    return errorTime > hourAgo;
  });

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant="destructive" 
        className="cursor-pointer hover:bg-red-600 transition-colors"
        onClick={() => {
          // Could open a modal or navigate to error dashboard
          console.log('Error stats clicked', errors);
        }}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        {recentErrors.length} errors in last hour
      </Badge>
    </div>
  );
};
