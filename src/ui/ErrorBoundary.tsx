import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[DRISHTI ErrorBoundary Caught Error]:', error, errorInfo);
  }

  public handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon-950/95 p-6 font-mono text-xs select-none">
          <div className="max-w-md w-full border border-threat bg-carbon-900 p-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-threat/40 pb-2 mb-3">
              <span className="text-threat font-bold font-display text-sm">
                ⚠ {this.props.fallbackTitle || 'TACTICAL C2 SUBSYSTEM FAULT'}
              </span>
            </div>
            <p className="text-text-dim mb-3">
              An unexpected interface error occurred. The simulation engine and recorded telemetry remain intact.
            </p>
            {this.state.error && (
              <pre className="bg-carbon-950 border border-line p-2 text-[10px] text-threat/90 overflow-x-auto mb-4 whitespace-pre-wrap">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={this.handleReset}
                className="px-3 py-1 bg-carbon-800 border border-line text-text-main hover:border-amber hover:text-amber font-bold transition-colors"
              >
                RECOVER INTERFACE
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-threat/20 border border-threat text-threat hover:bg-threat/30 font-bold transition-colors"
              >
                RELOAD SYSTEM
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
