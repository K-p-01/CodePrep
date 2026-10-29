import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CodePrep rendering error:", error, errorInfo);
  }

  retry = () => {
    this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <main className="error-boundary" role="alert" aria-live="assertive">
          <span className="eyebrow">Page error</span>
          <h1>CodePrep could not show this page.</h1>
          <p>Your saved progress remains in this browser. You can try rendering the page again or return to the dashboard.</p>
          <div className="error-boundary-actions">
            <button type="button" className="primary-button" onClick={this.retry}>Try again</button>
            <a className="secondary-button" href="/">Return to dashboard</a>
          </div>
        </main>
      );
    }
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
