import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasRemoteConfigError: boolean;
}

export class RemoteConfigBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasRemoteConfigError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a remote configuration error
    if (
      error.message.includes("remote") ||
      error.message.includes("fetch") ||
      error.message.includes("config")
    ) {
      return { hasRemoteConfigError: true };
    }
    // Re-throw if it's not a remote config error
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Remote configuration failed:", error);
    // Don't fail the entire operation, just log the warning
  }

  render() {
    if (this.state.hasRemoteConfigError) {
      return (
        this.props.fallback || (
          <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-700">
              Remote configuration could not be applied. The worktree was
              created successfully, but remote tracking may need to be
              configured manually.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
