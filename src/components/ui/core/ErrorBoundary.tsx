import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string; // Identify which section crashed
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

import * as Sentry from "@sentry/react";

/**
 * Report errors to external monitoring (Sentry / Logflare).
 * PRIVACY: Never include decrypted message content or encryption keys.
 */
function reportError(error: Error, errorInfo: ErrorInfo, componentName?: string) {
  // Console report (always)
  console.error("ErrorBoundary caught an error:", error, errorInfo);

  // Sentry handles DSN checks internally based on init
  Sentry.captureException(error, {
    tags: {
      componentName: componentName || 'unknown',
    },
    extra: {
      componentStack: errorInfo.componentStack?.substring(0, 1000),
    }
  });
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(error, errorInfo, this.props.componentName);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="w-full flex flex-col items-center justify-center p-12 bg-card rounded-3xl border border-destructive/20 shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent opacity-50 pointer-events-none" />
          
          <div className="relative z-10 p-5 bg-destructive/10 rounded-full blur-[0.5px] mb-8 ring-4 ring-destructive/5">
            <AlertTriangle className="w-12 h-12 text-destructive drop-shadow-md" strokeWidth={1.5} />
          </div>
          
          <h2 className="text-2xl font-bold mb-3 text-foreground z-10 text-center tracking-tight">
            Oops, something went wrong
          </h2>
          
          <p className="text-muted-foreground text-center max-w-md mb-2 z-10 text-sm leading-relaxed">
            {this.state.error?.message || "A critical error occurred while rendering this section."}
          </p>

          {this.props.componentName && (
            <p className="text-muted-foreground/60 text-center mb-8 z-10 text-xs">
              Component: {this.props.componentName}
            </p>
          )}
          
          <Button 
            variant="default"
            size="lg"
            className="z-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 shadow-lg hover:shadow-primary/30 transition-all font-medium flex items-center gap-2"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
          >
            <RefreshCcw className="w-4 h-4" />
            Reload Application
          </Button>

          {/* Decorative glow elements */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-destructive/10 rounded-full blur-[80px]" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
        </div>
      );
    }

    return this.props.children;
  }
}
