import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-gray-900 text-white flex flex-col items-center justify-center p-8 overflow-auto font-sans">
          <div className="max-w-4xl w-full bg-gray-800 border border-red-600 rounded-lg shadow-2xl p-6">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-6">
              The application encountered a critical error and cannot continue.
            </p>
            
            {this.state.error && (
              <div className="bg-red-900/20 border border-red-900 p-4 rounded mb-4">
                <p className="font-mono text-red-300 break-words">
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

            <div className="flex justify-end">
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