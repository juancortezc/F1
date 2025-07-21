import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-100 mb-4">¡Ups! Algo salió mal</h1>
            <p className="text-slate-400 mb-6">
              Ha ocurrido un error inesperado. Por favor recarga la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#FF1801] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#E61601] transition-colors"
            >
              Recargar Página
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left bg-slate-800 p-4 rounded text-sm">
                <summary className="cursor-pointer text-slate-300">Detalles del Error</summary>
                <pre className="mt-2 text-red-400 text-xs overflow-auto">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;