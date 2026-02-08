'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component that catches render errors in its children.
 *
 * Use this to wrap critical sections like the meeting editor,
 * financial dashboard, and document viewer to prevent data loss
 * and provide a recovery option.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={<p>Something went wrong with the editor.</p>}
 *   onError={(error) => logError(error)}
 * >
 *   <MeetingEditor />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    // In production, send to error tracking (Sentry, etc.)
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error?: Error;
  onReset?: () => void;
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-destructive/20 bg-destructive/5">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="font-semibold text-lg mb-1">Something went wrong</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
        An error occurred while rendering this section. Your data has been preserved.
      </p>
      {error && process.env.NODE_ENV === 'development' && (
        <pre className="text-xs bg-muted p-3 rounded mb-4 max-w-full overflow-auto">
          {error.message}
        </pre>
      )}
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}
