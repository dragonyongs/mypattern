import React from "react";
import { RefreshCw } from "lucide-react";

interface RetryButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onClick,
  disabled = false,
  className = "",
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    type="button"
    className={`inline-flex items-center gap-2 px-5 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${className}`}
    title="다시 학습"
  >
    <RefreshCw className="w-4 h-4" />
    <span className="hidden sm:inline">다시학습</span>
  </button>
);

export default RetryButton;
