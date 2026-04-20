import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex flex-1 items-center justify-center p-8"
          style={{ background: "var(--bg-base)" }}
        >
          <div className="text-center">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Something went wrong
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-md px-4 py-2 text-sm"
              style={{
                background: "var(--primary)",
                color: "var(--bg-base)",
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "var(--primary-hover)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "var(--primary)";
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
