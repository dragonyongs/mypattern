// src/shared/components/ActionButtons.tsx
import React, { memo } from "react";
import { Check, RotateCcw } from "lucide-react";

interface ActionButtonsProps {
  isAnswered: boolean;
  canCheck: boolean;
  onCheck: () => void;
  onRetry: () => void;
  checkText?: string;
  retryText?: string;
}

export const ActionButtons = memo<ActionButtonsProps>(
  ({
    isAnswered,
    canCheck,
    onCheck,
    onRetry,
    checkText = "정답 확인",
    retryText = "다시 풀기",
  }) => {
    return (
      <div className="mt-4">
        {!isAnswered ? (
          <button
            onClick={onCheck}
            disabled={!canCheck}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
          >
            <Check className="w-4 h-4" />
            {checkText}
          </button>
        ) : (
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            {retryText}
          </button>
        )}
      </div>
    );
  }
);

ActionButtons.displayName = "ActionButtons";
export default ActionButtons;
