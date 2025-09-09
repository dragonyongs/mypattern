// src/components/workbook/ProgressBar.tsx
import React, { memo } from "react";

interface ProgressBarProps {
  progress: number;
  answeredCount: number;
  totalCount: number;
  score: number;
}

export const ProgressBar = memo<ProgressBarProps>(
  ({ progress, answeredCount, totalCount, score }) => {
    const accuracy =
      totalCount > 0 ? Math.round((score / totalCount) * 100) : 0;

    return (
      <div>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>진행률</span>
          <span>
            {answeredCount}/{totalCount}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>정답률</span>
            <span>{accuracy}%</span>
          </div>
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";
