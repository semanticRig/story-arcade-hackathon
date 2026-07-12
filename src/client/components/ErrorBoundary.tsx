import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State, object> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 dark:bg-gray-900 p-6 gap-4">
          <p className="text-3xl">😵</p>
          <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200">Something went wrong</h2>
          <p className="text-amber-600 dark:text-amber-400 text-sm text-center">{this.state.error.message}</p>
          <button
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
