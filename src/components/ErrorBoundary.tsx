import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  recoverKey: number;
}

// We intentionally do NOT block the user behind an "extension detected" screen.
// Any error caught here is auto-recovered: we remount the subtree and let the
// app keep running. If the error is from our own code it will resurface in
// console; if it's from a browser extension (MetaMask, Phantom, Grammarly,
// ChatGPT sidebar, password managers, ad blockers, etc.) the user is never
// locked out regardless of which extension they have installed.
class ErrorBoundary extends Component<Props, State> {
  private retries = 0;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, recoverKey: 0 };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, recoverKey: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.warn("ErrorBoundary auto-recovering from:", error?.message, errorInfo?.componentStack);
    // Auto-recover up to a generous limit to avoid pathological infinite loops.
    if (this.retries < 25) {
      this.retries += 1;
      setTimeout(() => {
        this.setState((s) => ({ hasError: false, recoverKey: s.recoverKey + 1 }));
      }, 0);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render nothing for a tick; componentDidCatch will flip hasError back.
      return null;
    }
    return <div key={this.state.recoverKey}>{this.props.children}</div>;
  }
}

export default ErrorBoundary;
