import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center bg-bg-surface/50 rounded-xl border border-border-subtle backdrop-blur-sm">
           <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3 border border-red-500/20">
             <i className="fa-solid fa-triangle-exclamation text-red-500 text-xl"></i>
           </div>
           <h3 className="text-sm font-bold text-text-primary mb-1">Something went wrong</h3>
           <p className="text-xs text-text-secondary mb-4 max-w-[200px] leading-relaxed">
             {this.props.name ? `${this.props.name}: ` : ''}
             {this.state.error?.message || "An unexpected error occurred."}
           </p>
           <button 
             onClick={() => this.setState({ hasError: false })}
             className="px-4 py-2 bg-text-primary text-bg-main text-xs font-medium rounded-lg hover:opacity-90 transition-opacity shadow-sm"
           >
             Try Again
           </button>
        </div>
      );
    }

    return this.props.children;
  }
}