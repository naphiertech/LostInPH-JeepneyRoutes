import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  scopeLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error.',
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--danger-subtle)] text-[var(--danger)]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
            {this.props.scopeLabel
              ? `${this.props.scopeLabel} encountered an error`
              : 'Something went wrong'}
          </h2>
          <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3.5 py-2 text-xs font-medium text-[var(--surface)] hover:opacity-90"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reload view</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
