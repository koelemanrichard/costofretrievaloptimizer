import React, { Component, ErrorInfo, ReactNode } from 'react';
import { categorizeError } from '../utils/errorMessages';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleTryAgain = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { title, message, action, category } = categorizeError(this.state.error);
      const canRetry = this.state.retryCount < 3 && category !== 'CHUNK_LOAD_ERROR';

      // Auto-reload for chunk load errors (new version available)
      if (category === 'CHUNK_LOAD_ERROR') {
        setTimeout(() => window.location.reload(), 2000);
      }

      return (
        <div className="fixed inset-0 z-[9999] bg-gray-900 text-white flex flex-col items-center justify-center p-8 overflow-auto font-sans">
          <div className="max-w-4xl w-full bg-gray-800 border border-red-600 rounded-lg shadow-2xl p-6">
            <h1 className="text-3xl font-bold text-red-500 mb-4">{title}</h1>
            <p className="text-gray-300 mb-6">
              {message}
            </p>

            {this.state.error && (
              <div className="bg-red-900/20 border border-red-900 p-4 rounded mb-4">
                <p className="font-mono text-red-300 break-words text-sm">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {this.state.errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-gray-400 hover:text-white mb-2">
                  View Component Stack
                </summary>
                <pre className="bg-black/50 p-4 rounded text-xs text-gray-400 overflow-auto max-h-60">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {this.state.retryCount > 0 && (
              <p className="text-xs text-gray-500 mb-4">
                Retry attempts: {this.state.retryCount}/3
              </p>
            )}

            <div className="flex justify-end gap-3">
              {canRetry && (
                <button
                  onClick={this.handleTryAgain}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition-colors"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
