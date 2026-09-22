import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("CodePrep UI error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="app-error-shell">
        <div className="app-error-card">
          <div className="brand-mark app-error-mark">🎓</div>
          <span className="eyebrow">CodePrep</span>
          <h1>Something went wrong.</h1>
          <p>The page hit an unexpected error. Reloading usually gets the study session back on track.</p>
          <button className="primary-button" type="button" onClick={this.handleReload}>Reload CodePrep</button>
          {this.state.error?.message ? <small>{this.state.error.message}</small> : null}
        </div>
      </div>
    );
  }
}

