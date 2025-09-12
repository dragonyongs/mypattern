import React from "react";

import { CheckSquare } from "lucide-react";

interface CompleteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const CompleteButton: React.FC<CompleteButtonProps> = ({
  onClick,
  disabled = false,
  className = "",
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    type="button"
    className={`inline-flex items-center gap-2 px-5 py-2.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${className}`}
    title="학습 완료"
  >
    <CheckSquare className="w-4 h-4" />
    <span className="hidden sm:inline">학습완료</span>
  </button>
);

export default CompleteButton;
