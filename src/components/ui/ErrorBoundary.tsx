import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-red-800 mb-2">
              앱에 오류가 발생했습니다
            </h1>
            <p className="text-red-600 mb-4 text-sm">
              {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary w-full"
              >
                새로고침
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="btn btn-secondary w-full"
              >
                다시 시도
              </button>
            </div>
            <details className="mt-4 text-left">
              <summary className="text-sm text-red-600 cursor-pointer">
                기술적 세부사항
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}