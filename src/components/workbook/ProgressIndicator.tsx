// src/components/workbook/ProgressIndicator.tsx
import React, { memo } from "react";
import type { WorkbookItem } from "@/types/workbook.types";

interface ProgressIndicatorProps {
  workbook: WorkbookItem[];
  currentIndex: number;
  correctAnswers: Set<number>;
  answeredQuestions: Set<number>;
  onIndexChange: (index: number) => void;
}

export const ProgressIndicator = memo<ProgressIndicatorProps>(
  ({
    workbook,
    currentIndex,
    correctAnswers,
    answeredQuestions,
    onIndexChange,
  }) => {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {workbook.map((_, idx) => (
          <button
            key={idx}
            onClick={() => onIndexChange(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              idx === currentIndex
                ? "w-8 bg-indigo-600"
                : correctAnswers.has(idx)
                ? "w-1.5 bg-green-500"
                : answeredQuestions.has(idx)
                ? "w-1.5 bg-red-400"
                : "w-1.5 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    );
  }
);

ProgressIndicator.displayName = "ProgressIndicator";
