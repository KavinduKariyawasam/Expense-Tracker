import React from "react";

class ChatbotErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Store error info for potential debugging
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI when chatbot crashes
      return (
        <div className="chatbot-error-fallback">
          <div
            className="chatbot-bubble error-bubble"
            onClick={this.handleRetry}
          >
            <div className="bubble-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="error-tooltip">
              Chatbot temporarily unavailable. Click to retry.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ChatbotErrorBoundary.propTypes = {
  children: function (props, propName, componentName) {
    if (props[propName] === undefined) {
      return new Error(
        `Missing required prop: ${propName} for component: ${componentName}`
      );
    }
  },
};

export default ChatbotErrorBoundary;
