import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary caught]:', error);
    this.props.onError?.(error, info.componentStack ?? '');
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          background: '#0f0f1a',
          color: '#e8e8f0',
          fontFamily: 'sans-serif'
        }}>
          <div style={{ fontSize: '40px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: 500 }}>
            Something went wrong
          </div>
          <div style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </div>
          <button
            onClick={this.reset}
            style={{
              marginTop: '8px',
              padding: '10px 24px',
              background: '#7c6ef7',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
