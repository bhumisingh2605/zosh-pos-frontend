import { Component } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Zosh POS crashed:', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="max-w-sm text-center">
          <AlertOctagon size={32} className="text-receipt-red mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-ink-text mb-2">Something went wrong</h1>
          <p className="text-sm text-ink-text-muted mb-6">
            The app hit an unexpected error and couldn't continue. Reloading usually fixes it —
            if it keeps happening, let your admin know what you were doing when it broke.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 rounded-sm bg-ledger text-white text-sm px-4 py-2 hover:bg-ledger-dark"
          >
            <RefreshCw size={15} /> Reload the app
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 text-left text-xs text-receipt-red bg-receipt-red-soft rounded-sm p-3 overflow-auto max-h-48">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}