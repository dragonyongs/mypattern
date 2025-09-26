// src/features/drawing/components/DrawingErrorBoundary.tsx
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

class DrawingErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: error.message || "Unknown error occurred",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("🚨 Drawing Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-red-500" />

              <div>
                <h3 className="font-bold text-red-800 text-lg mb-2">
                  그림 그리기 기능 오류
                </h3>
                <p className="text-red-600 text-sm mb-2">
                  그림 그리기에서 오류가 발생했습니다.
                  <br />더 안정적인 라이브러리로 업데이트되었습니다.
                </p>
              </div>

              <button
                onClick={this.handleReset}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default DrawingErrorBoundary;
