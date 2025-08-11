// src/components/ErrorBoundary.jsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: crashlytics().recordError(error);
  }

  handleRetry = () => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    // For web, reload the page
    if (typeof window !== "undefined" && window.location) {
      window.location.reload();
    } else {
      // For mobile, just retry
      this.handleRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              We&apos;re sorry, but something unexpected happened. Please try
              again.
            </Text>

            {/* Show error details in development */}
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={this.handleRetry}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.handleReload}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Reload App
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#212529",
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#6c757d",
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: "100%",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#856404",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: "#856404",
    fontFamily: "monospace",
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  button: {
    backgroundColor: "#007bff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#007bff",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#007bff",
  },
});

export default ErrorBoundary;
