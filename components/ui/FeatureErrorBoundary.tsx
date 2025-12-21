/**
 * FeatureErrorBoundary - Component-level error boundary for feature sections
 *
 * Unlike GlobalErrorBoundary which takes over the entire screen,
 * this component provides a localized error UI for feature sections.
 * Use this to wrap major feature components to prevent errors from
 * crashing the entire application.
 *
 * Created: 2024-12-20 - Component-level error boundaries
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  /** Name of the feature for error reporting */
  featureName?: string;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Whether to show technical error details (default: false in production) */
  showDetails?: boolean;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Custom retry action */
  onRetry?: () => void;
}

interface FeatureErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
  public state: FeatureErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<FeatureErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[FeatureErrorBoundary] Error in ${this.props.featureName || 'feature'}:`, error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = process.env.NODE_ENV === 'development';
      const showDetails = this.props.showDetails ?? isDevelopment;

      return (
        <Card className="p-6 border-red-500/50 bg-red-900/10">
          <div className="flex items-start gap-4">
            {/* Error icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-red-400 mb-1">
                {this.props.featureName
                  ? `${this.props.featureName} encountered an error`
                  : 'Something went wrong'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                This section failed to load. You can try again or continue using other parts of the application.
              </p>

              {/* Error details (collapsible) */}
              {showDetails && this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-300 mb-2">
                    Technical details
                  </summary>
                  <div className="bg-gray-900/50 rounded p-3 overflow-auto">
                    <p className="font-mono text-xs text-red-300 break-words mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="font-mono text-xs text-gray-500 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={this.handleRetry}
                  className="!bg-red-600/20 hover:!bg-red-600/30 !text-red-300"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap a component with FeatureErrorBoundary
 */
export function withFeatureErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName?: string
): React.FC<P> {
  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <FeatureErrorBoundary featureName={featureName}>
      <WrappedComponent {...props} />
    </FeatureErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withFeatureErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ComponentWithErrorBoundary;
}

export default FeatureErrorBoundary;
