import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(() => this.setState({ hasError: false }));
      }
      return this.props.fallback || (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded text-red-400 font-cactus text-sm">
          Une erreur est survenue dans cette partie de l'interface.
          <button 
            className="block mt-2 underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}